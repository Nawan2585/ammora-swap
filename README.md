# Ammora Swap — Builder Mission DEX

A professional React/Vite frontend scaffold for the Ammora Builder Mission, targeting **GIWA Sepolia (chain ID 91342)** and pinning **`@ammora-protocol/sdk@0.3.9`**.

## Run locally

Requirements: Node.js 22 or 24.

```bash
npm install
npm run dev
```

Open the local URL printed by Vite.

## Build for hosting

```bash
npm run build
npm run preview
```

The static production site is generated in `dist/` and can be deployed to Vercel, Netlify, or another static host.

## What is implemented

- Responsive DEX interface with token selection, amount entry, direction switch and slippage settings.
- Injected EVM wallet connection and account/network change handling.
- GIWA Sepolia chain switch/add flow.
- Native ETH balance read through viem.
- Official SDK dependency pinned to 0.3.9 and the documented `giwaSepoliaAutoRouteDeployment` catalog export checked against chain 91342.
- Links to the official Ammora documentation and GIWA explorer.

## Important: swap execution is deliberately not faked

The current public docs identify the supported swap integration boundary as `AmmoraSwapClient`, `PreparedExactInputSwap`, and the reviewed exact-input flow in the official `safe-swap.ts` example. The docs also require a reviewed pool, current quote, exact approval, receipt-block simulation, wallet signing, and receipt-block output reconciliation. They do not publish the complete frontend constructor/method signature in the quickstart page.

For that reason, the UI does **not** invent a quote or submit arbitrary calldata. The Review Swap action clearly reports that the reviewed SDK planner and a real supported pool must be wired before execution. Do not represent this preview as a completed on-chain exchange. The next integration step is to copy the exact `safe-swap.ts` source and its required helper modules from the official Ammora examples browser into a browser-safe adapter, replacing CLI signer logic with the connected wallet's WalletClient.

No private key, seed phrase, or secret is requested or stored by this project.

## Network

- Name: GIWA Sepolia
- Chain ID: 91342
- Native currency: ETH (testnet)
- RPC: `https://sepolia-rpc.giwa.io`
- Explorer: `https://sepolia-explorer.giwa.io`

Verify the current official RPC and explorer endpoints before production use. This is beta testnet software; no mainnet deployment or independent security audit is claimed.

## Official references

- https://docs.ammora.org/guides/sdk-quickstart
- https://docs.ammora.org/examples
- https://docs.ammora.org/guides/launchpad
- https://www.npmjs.com/package/@ammora-protocol/sdk
