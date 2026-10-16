
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const app = express();
const PORT = Number(process.env.PORT) || 3001;

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

app.get('/AbhishekApiTest', async (req, res) => {
  const contractAddress =
    '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238';

  const rpcUrl =
    'https://ethereum-sepolia-rpc.publicnode.com';

  console.log('[AbhishekApiTest] Request received');

  // Guarantee a response even if the RPC provider hangs.
  const timeout = setTimeout(() => {
    if (!res.headersSent) {
      console.error('[AbhishekApiTest] RPC request timed out');

      res.status(504).json({
        success: false,
        error: 'RPC request timed out',
        message: 'The Ethereum Sepolia provider did not respond in time.'
      });
    }
  }, 8000);

  try {
    const rpcPromise = fetch(rpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_call',
        params: [
          {
            to: contractAddress,
            data: '0x06fdde03'
          },
          'latest'
        ]
      })
    });

    const response = await Promise.race([
      rpcPromise,
      new Promise((_, reject) => {
        setTimeout(
          () => reject(new Error('RPC connection timed out')),
          7000
        );
      })
    ]);

    if (!response.ok) {
      throw new Error(`RPC HTTP status: ${response.status}`);
    }

    const rpcData = await response.json();

    if (rpcData.error) {
      throw new Error(
        rpcData.error.message || 'RPC returned an error'
      );
    }

    const encoded = rpcData.result;

    if (!encoded || encoded === '0x') {
      throw new Error('Contract returned no name data');
    }

    const bytes = encoded.slice(2);

    if (bytes.length < 128) {
      throw new Error('Unexpected ABI-encoded string');
    }

    const offset = Number(
      BigInt('0x' + bytes.slice(0, 64))
    );

    const lengthPosition = offset * 2;

    const length = Number(
      BigInt(
        '0x' +
          bytes.slice(lengthPosition, lengthPosition + 64)
      )
    );

    const nameStart = lengthPosition + 64;
    const nameHex = bytes.slice(
      nameStart,
      nameStart + length * 2
    );

    const contractName = Buffer.from(
      nameHex,
      'hex'
    ).toString('utf8');

    const result = {
      success: true,
      network: 'Ethereum Sepolia',
      chainId: 11155111,
      contractAddress,
      contractName
    };

    console.log('[AbhishekApiTest] Result:', result);

    if (!res.headersSent) {
      res.json(result);
    }
  } catch (error) {
    console.error('[AbhishekApiTest] Error:', error.message);

    if (!res.headersSent) {
      res.status(502).json({
        success: false,
        error: 'Could not fetch contract data',
        message: error.message
      });
    }
  } finally {
    clearTimeout(timeout);
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(
    `🔗 Contract API: http://localhost:${PORT}/AbhishekApiTest`
  );
});
