import { useEffect, useMemo, useState } from 'react';
import { ArrowDownUp, ArrowUpRight, Check, ChevronDown, CircleHelp, Clock3, Copy, ExternalLink, Fuel, Globe2, Menu, RefreshCw, Settings2, ShieldCheck, Wallet, Zap } from 'lucide-react';
import { createPublicClient, custom, formatEther, http } from 'viem';
import { defineChain } from 'viem';
import { giwaSepoliaAutoRouteDeployment } from '@ammora-protocol/sdk';

const giwa = defineChain({
  id: 91342,
  name: 'GIWA Sepolia',
  nativeCurrency: { name: 'GIWA Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: ['https://sepolia-rpc.giwa.io'] } },
  blockExplorers: { default: { name: 'GIWA Explorer', url: 'https://sepolia-explorer.giwa.io' } },
  testnet: true,
});

type EthereumProvider = { request: (args: { method: string; params?: unknown[] }) => Promise<any>; on?: (event: string, listener: (...args: any[]) => void) => void; removeListener?: (event: string, listener: (...args: any[]) => void) => void };
declare global { interface Window { ethereum?: EthereumProvider } }

const TOKENS = [
  { symbol: 'ETH', name: 'GIWA Ether', icon: 'Ξ', color: 'eth', address: 'native', decimals: 18 },
  { symbol: 'WETH', name: 'Wrapped Ether', icon: 'W', color: 'weth', address: '', decimals: 18 },
  { symbol: 'USDC', name: 'USD Coin', icon: '$', color: 'usdc', address: '', decimals: 6 },
  { symbol: 'tAMM', name: 'Ammora Test Token', icon: 'A', color: 'amm', address: '', decimals: 18 },
];

function shortAddress(value: string) { return `${value.slice(0, 6)}…${value.slice(-4)}`; }

export default function App() {
  const [account, setAccount] = useState('');
  const [chainId, setChainId] = useState<number | null>(null);
  const [balance, setBalance] = useState('—');
  const [from, setFrom] = useState('ETH');
  const [to, setTo] = useState('WETH');
  const [amount, setAmount] = useState('');
  const [slippage, setSlippage] = useState('0.50');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [tokenMenu, setTokenMenu] = useState<'from' | 'to' | null>(null);
  const [notice, setNotice] = useState('Connect a wallet to begin on GIWA Sepolia.');
  const [busy, setBusy] = useState(false);
  const [txHash, setTxHash] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);

  const sdkReady = useMemo(() => {
    try { return giwaSepoliaAutoRouteDeployment.chain.id === 91342; } catch { return false; }
  }, []);
  const publicClient = useMemo(() => createPublicClient({ chain: giwa, transport: http() }), []);
  const isCorrectChain = chainId === 91342;

  async function refreshWallet(addr = account) {
    if (!addr) return;
    try {
      const bal = await publicClient.getBalance({ address: addr as `0x${string}` });
      setBalance(Number(formatEther(bal)).toFixed(5));
    } catch { setBalance('Unavailable'); }
  }

  async function connectWallet() {
    if (!window.ethereum) { setNotice('No EVM wallet detected. Install MetaMask or another injected wallet.'); return; }
    setBusy(true);
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const net = await window.ethereum.request({ method: 'eth_chainId' });
      const addr = accounts?.[0] || '';
      setAccount(addr); setChainId(Number.parseInt(net, 16));
      if (addr) await refreshWallet(addr);
      setNotice(Number.parseInt(net, 16) === 91342 ? 'Wallet connected to GIWA Sepolia.' : 'Wallet connected. Switch to GIWA Sepolia to use this exchange.');
    } catch (e: any) { setNotice(e?.shortMessage || e?.message || 'Wallet connection was cancelled.'); }
    finally { setBusy(false); }
  }

  async function switchNetwork() {
    if (!window.ethereum) return;
    try {
      await window.ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: '0x164ce' }] });
      const net = await window.ethereum.request({ method: 'eth_chainId' });
      setChainId(Number.parseInt(net, 16)); setNotice('Connected network updated.');
      if (account) await refreshWallet();
    } catch (e: any) {
      if (e?.code === 4902) {
        try {
          await window.ethereum.request({ method: 'wallet_addEthereumChain', params: [{ chainId: '0x164ce', chainName: 'GIWA Sepolia', nativeCurrency: { name: 'GIWA Ether', symbol: 'ETH', decimals: 18 }, rpcUrls: ['https://sepolia-rpc.giwa.io'], blockExplorerUrls: ['https://sepolia-explorer.giwa.io'] }] });
          setChainId(91342); setNotice('GIWA Sepolia added to your wallet.');
        } catch (addError: any) { setNotice(addError?.message || 'Could not add GIWA Sepolia.'); }
      } else setNotice(e?.message || 'Network switch was cancelled.');
    }
  }

  useEffect(() => {
    if (!window.ethereum) return;
    const onAccounts = (accounts: string[]) => { setAccount(accounts?.[0] || ''); if (!accounts?.[0]) setBalance('—'); };
    const onChain = (hex: string) => setChainId(Number.parseInt(hex, 16));
    window.ethereum.request({ method: 'eth_accounts' }).then((a: string[]) => { if (a?.[0]) setAccount(a[0]); }).catch(() => {});
    window.ethereum.request({ method: 'eth_chainId' }).then((c: string) => setChainId(Number.parseInt(c, 16))).catch(() => {});
    window.ethereum.on?.('accountsChanged', onAccounts);
    window.ethereum.on?.('chainChanged', onChain);
    return () => { window.ethereum?.removeListener?.('accountsChanged', onAccounts); window.ethereum?.removeListener?.('chainChanged', onChain); };
  }, []);
  useEffect(() => { if (account) refreshWallet(); }, [account]);

  function swapDirection() { setFrom(to); setTo(from); setAmount(''); setNotice('Token direction changed.'); }
  function chooseToken(side: 'from' | 'to', symbol: string) {
    if (side === 'from') { if (symbol === to) setTo(from); setFrom(symbol); }
    else { if (symbol === from) setFrom(to); setTo(symbol); }
    setTokenMenu(null); setAmount('');
  }
  function startSwap() {
    setNotice('Swap execution is locked until a live pool and the SDK’s reviewed exact-input planner are configured. No transaction has been sent.');
  }

  const selectedFrom = TOKENS.find(t => t.symbol === from)!;
  const selectedTo = TOKENS.find(t => t.symbol === to)!;
  const amountValid = Number(amount) > 0 && Number.isFinite(Number(amount));

  return <div className="app-shell">
    <header className="topbar">
      <a className="brand" href="#top"><span className="brand-mark"><span/></span><span>ammora<span className="brand-light">swap</span></span><small>COMMUNITY DEX</small></a>
      <nav className={menuOpen ? 'nav nav-open' : 'nav'}><a className="active" href="#swap">Swap</a><a href="#markets">Markets</a><a href="#activity">Activity</a><a href="https://docs.ammora.org" target="_blank" rel="noreferrer">Docs <ArrowUpRight size={13}/></a></nav>
      <div className="top-actions"><div className="network-pill"><span className="green-dot"/>GIWA Testnet <ChevronDown size={14}/></div><button className="wallet-btn" onClick={account ? () => navigator.clipboard?.writeText(account) : connectWallet} disabled={busy}>{account ? <><Wallet size={16}/>{shortAddress(account)}<Copy size={13}/></> : <><Wallet size={16}/>{busy ? 'Connecting…' : 'Connect wallet'}</>}</button><button className="mobile-menu" onClick={() => setMenuOpen(!menuOpen)}><Menu/></button></div>
    </header>

    <main id="top">
      <section className="hero"><div className="hero-copy"><div className="eyebrow"><span className="eyebrow-dot"/> BUILT ON AMMORA SDK <span className="eyebrow-line"/></div><h1>Trade with<br/><em>confidence.</em></h1><p>A cleaner way to swap digital assets on GIWA. Non-custodial by design, powered by programmable liquidity.</p><div className="hero-meta"><span><ShieldCheck size={15}/> Self-custody</span><span><Zap size={15}/> Onchain settlement</span><span><Globe2 size={15}/> GIWA Sepolia</span></div></div><div className="hero-orbit"><div className="orbit orbit-one"/><div className="orbit orbit-two"/><div className="orbit-core"><span>✦</span></div><div className="orbit-chip chip-a">Ξ</div><div className="orbit-chip chip-b">A</div><div className="orbit-chip chip-c">$</div></div></section>

      <section className="workspace" id="swap">
        <div className="swap-card">
          <div className="card-heading"><div><div className="section-kicker">EXCHANGE</div><h2>Swap tokens</h2></div><button className="icon-btn" onClick={() => setSettingsOpen(!settingsOpen)} aria-label="Swap settings"><Settings2 size={19}/></button></div>
          {settingsOpen && <div className="settings-panel"><div><b>Slippage tolerance</b><span>Maximum price movement accepted</span></div><div className="slippage-options">{['0.10','0.50','1.00'].map(v => <button key={v} className={slippage === v ? 'selected' : ''} onClick={() => setSlippage(v)}>{v}%</button>)}<label><input value={slippage} onChange={e => setSlippage(e.target.value)} aria-label="Custom slippage"/>%</label></div></div>}
          <div className="field-label"><span>You pay</span><span>{account && from === 'ETH' ? `Balance ${balance} ETH` : 'Balance —'}</span></div>
          <div className="token-box"><input className="amount-input" inputMode="decimal" placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value.replace(/[^0-9.]/g, ''))}/><div className="token-wrap"><button className="token-select" onClick={() => setTokenMenu(tokenMenu === 'from' ? null : 'from')}><span className={`token-icon ${selectedFrom.color}`}>{selectedFrom.icon}</span><span><b>{selectedFrom.symbol}</b><small>{selectedFrom.name}</small></span><ChevronDown size={16}/></button>{tokenMenu === 'from' && <div className="token-menu">{TOKENS.filter(t => t.symbol !== to).map(t => <button key={t.symbol} onClick={() => chooseToken('from', t.symbol)}><span className={`token-icon ${t.color}`}>{t.icon}</span><span><b>{t.symbol}</b><small>{t.name}</small></span></button>)}</div>}</div></div>
          <div className="switch-row"><span className="switch-line"/><button className="switch-btn" onClick={swapDirection}><ArrowDownUp size={17}/></button><span className="switch-line"/></div>
          <div className="field-label"><span>You receive</span><span>Estimated amount</span></div>
          <div className="token-box output-box"><div className="amount-output">—</div><div className="token-wrap"><button className="token-select" onClick={() => setTokenMenu(tokenMenu === 'to' ? null : 'to')}><span className={`token-icon ${selectedTo.color}`}>{selectedTo.icon}</span><span><b>{selectedTo.symbol}</b><small>{selectedTo.name}</small></span><ChevronDown size={16}/></button>{tokenMenu === 'to' && <div className="token-menu">{TOKENS.filter(t => t.symbol !== from).map(t => <button key={t.symbol} onClick={() => chooseToken('to', t.symbol)}><span className={`token-icon ${t.color}`}>{t.icon}</span><span><b>{t.symbol}</b><small>{t.name}</small></span></button>)}</div>}</div></div>
          <div className="route-info"><div><span>Network</span><b>GIWA Sepolia</b></div><div><span>Slippage</span><b>{slippage || '0.50'}%</b></div><div><span>Network fee</span><b>—</b></div></div>
          {!account ? <button className="primary-btn" onClick={connectWallet}><Wallet size={17}/> Connect wallet</button> : !isCorrectChain ? <button className="primary-btn" onClick={switchNetwork}>Switch to GIWA Sepolia <ArrowUpRight size={17}/></button> : <button className="primary-btn" onClick={startSwap} disabled={!amountValid || busy}>Review swap <ArrowUpRight size={17}/></button>}
          <div className="notice"><CircleHelp size={15}/><span>{notice}</span></div>
          {txHash && <div className="tx-row"><Check size={15}/> <a href={`${giwa.blockExplorers.default.url}/tx/${txHash}`} target="_blank" rel="noreferrer">View transaction <ExternalLink size={12}/></a></div>}
        </div>
        <aside className="side-column">
          <div className="network-card"><div className="network-card-top"><div className="network-icon">G</div><div><b>GIWA Sepolia</b><small>Testnet environment</small></div><span className="live-badge"><i/> {isCorrectChain ? 'Connected' : 'Ready'}</span></div><div className="network-stats"><div><span>Chain ID</span><b>91342</b></div><div><span>Wallet</span><b>{account ? shortAddress(account) : 'Not connected'}</b></div></div><a href="https://sepolia-explorer.giwa.io" target="_blank" rel="noreferrer">Open block explorer <ArrowUpRight size={14}/></a></div>
          <div className="info-card"><div className="info-icon"><ShieldCheck size={18}/></div><h3>Your keys. Your assets.</h3><p>Ammora Swap is non-custodial. Your wallet reviews and authorizes every transaction. This interface never asks for your seed phrase or private key.</p><div className="info-foot"><span/> Wallet-controlled execution</div></div>
          <div className="sdk-card"><div className="sdk-top"><span className="sdk-mark">✳</span><span>POWERED BY</span></div><h3>Ammora SDK <strong>0.3.9</strong></h3><p>Composable liquidity infrastructure for the next generation of onchain markets.</p><a href="https://docs.ammora.org/guides/sdk-quickstart" target="_blank" rel="noreferrer">Developer documentation <ArrowUpRight size={14}/></a><div className="sdk-status"><span className={sdkReady ? 'status-check' : ''}>{sdkReady ? <Check size={12}/> : <Clock3 size={12}/>}</span>{sdkReady ? 'GIWA deployment catalog loaded' : 'SDK deployment not verified'}</div></div>
        </aside>
      </section>

      <section className="bottom-section" id="markets"><div className="bottom-heading"><div><div className="section-kicker">BUILT FOR GIWA</div><h2>Simple swaps. Smarter liquidity.</h2></div><a href="https://docs.ammora.org" target="_blank" rel="noreferrer">Explore Ammora <ArrowUpRight size={15}/></a></div><div className="feature-grid"><article><div className="feature-icon purple"><Zap size={18}/></div><h3>Programmable liquidity</h3><p>Access Ammora's modular market infrastructure through a single SDK.</p></article><article><div className="feature-icon mint"><ShieldCheck size={18}/></div><h3>Wallet-first security</h3><p>Review transaction details and approve each action in your own wallet.</p></article><article><div className="feature-icon blue"><RefreshCw size={18}/></div><h3>Transparent execution</h3><p>Track confirmed activity on the GIWA Sepolia block explorer.</p></article></div></section>
      <section className="activity-section" id="activity"><div><div className="section-kicker">RECENT ACTIVITY</div><h2>Transaction history</h2></div><div className="empty-activity"><Clock3 size={19}/><span>Connect your wallet to view your activity.</span></div></section>
    </main>
    <footer><a className="brand footer-brand" href="#top"><span className="brand-mark"><span/></span><span>ammora<span className="brand-light">swap</span></span></a><span>Community-built interface · GIWA Sepolia testnet</span><a href="https://docs.ammora.org" target="_blank" rel="noreferrer">Ammora docs <ArrowUpRight size={13}/></a></footer>
  </div>;
}
