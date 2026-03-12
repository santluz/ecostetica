/* eslint-disable no-restricted-globals */
/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from "react";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, onSnapshot } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAPtdoXi5q5xf6KG0ltApdr6kHHbk4jJRQ",
  authDomain: "veteranosfc-fd317.firebaseapp.com",
  projectId: "veteranosfc-fd317",
  storageBucket: "veteranosfc-fd317.firebasestorage.app",
  messagingSenderId: "729812514430",
  appId: "1:729812514430:web:7e4702516891cbeb4a4a2f",
  measurementId: "G-7CCRKBG35N"
};

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);
const DOC_ID = "ecoaction";

function maskTelefone(v) {
  v = v.replace(/\D/g, "").slice(0, 11);
  if (v.length <= 2) return v.length ? `(${v}` : "";
  if (v.length <= 6) return `(${v.slice(0,2)}) ${v.slice(2)}`;
  if (v.length <= 10) return `(${v.slice(0,2)}) ${v.slice(2,6)}-${v.slice(6)}`;
  return `(${v.slice(0,2)}) ${v.slice(2,7)}-${v.slice(7)}`;
}
function maskDinheiro(v) {
  v = v.replace(/\D/g, "");
  if (!v) return "";
  return (parseInt(v, 10) / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function parseDinheiro(v) { return parseFloat(String(v).replace(/\./g, "").replace(",", ".")) || 0; }
function fmtDinheiro(n) { return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); }
function mesAtualStr() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}`;
}
function nomeMes(mesStr) {
  const [ano, mes] = mesStr.split("-");
  const nomes = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
  return `${nomes[parseInt(mes)-1]} ${ano}`;
}
function dataHoje() { return new Date().toISOString().split("T")[0]; }

const CATEGORIAS_DESPESA = ["Aluguel","Produtos","Equipamentos","Funcionários","Utilidades","Marketing","Outros"];
const STATUS_OS = ["Aguardando","Em Andamento","Pronto","Entregue","Cancelado"];
const STATUS_OS_COLOR = { "Aguardando":"#ffba00", "Em Andamento":"#3b82f6", "Pronto":"#00d97e", "Entregue":"#94a3b8", "Cancelado":"#ff4757" };

const S = {
  page: { minHeight:"100vh", background:"#060c18", color:"#e8ecf3", fontFamily:"'Barlow', sans-serif" },
  card: { background:"linear-gradient(135deg, #111827, #1a2540)", border:"1px solid #1e2e50", borderRadius:16, padding:24 },
  cardSm: { background:"#0d1525", border:"1px solid #1e2e50", borderRadius:12, padding:16 },
  input: { width:"100%", padding:"10px 14px", borderRadius:10, background:"#0d1525", border:"1px solid #1e2e50", color:"#e8ecf3", fontFamily:"'Barlow', sans-serif", fontSize:15, boxSizing:"border-box", outline:"none" },
  label: { fontSize:11, fontWeight:700, color:"#64748b", letterSpacing:1, marginBottom:4, display:"block" },
  btn: (color="#3b82f6") => ({ cursor:"pointer", border:"none", borderRadius:10, background:`linear-gradient(135deg, ${color}, ${color}cc)`, color:"#fff", padding:"10px 20px", fontFamily:"'Barlow', sans-serif", fontWeight:700, fontSize:14 }),
  btnGhost: { cursor:"pointer", border:"1px solid #1e2e50", borderRadius:10, background:"transparent", color:"#94a3b8", padding:"10px 20px", fontFamily:"'Barlow', sans-serif", fontWeight:700, fontSize:14 },
  h1: { fontFamily:"'Barlow Condensed', sans-serif", fontWeight:900, fontSize:32, margin:0 },
  h2: { fontFamily:"'Barlow Condensed', sans-serif", fontWeight:900, fontSize:24, margin:0 },
  modal: { position:"fixed", inset:0, background:"rgba(0,0,0,0.75)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:16 },
  modalBox: { background:"#0d1525", border:"1px solid #1e2e50", borderRadius:20, padding:28, width:"100%", maxWidth:520, maxHeight:"90vh", overflowY:"auto" },
  tag: (color) => ({ display:"inline-block", padding:"3px 10px", borderRadius:20, fontSize:12, fontWeight:700, background:`${color}22`, color }),
  grid2: { display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 },
};

class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError() { return { hasError: false }; }
  componentDidCatch(e, i) { console.error(e, i); }
  render() { return this.props.children; }
}

export default function App() {
  const [logado, setLogado] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [senhaInput, setSenhaInput] = useState("");
  const [tipoAcesso, setTipoAcesso] = useState("visitante");
  const [erroLogin, setErroLogin] = useState("");
  const [showSenhaLogin, setShowSenhaLogin] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const [senhaAdmin, setSenhaAdminState] = useState("admin123");
  const [nomeEstab, setNomeEstabState] = useState("ECOACTION");
  const [logoUrl, setLogoUrlState] = useState("");
  const [clientes, setClientesState] = useState([]);
  const [ordens, setOrdensState] = useState([]);
  const [despesas, setDespesasState] = useState([]);
  const [estoque, setEstoqueState] = useState([]);
  const [tabelaServicos, setTabelaServicosState] = useState([
    { id:1, nome:"Lavagem Completa", preco:"80,00" },
    { id:2, nome:"Polimento", preco:"250,00" },
    { id:3, nome:"Cristalização Cerâmica", preco:"600,00" },
    { id:4, nome:"Higienização Interna", preco:"150,00" },
  ]);

  const [aba, setAba] = useState("dashboard");
  const [mesFiltro, setMesFiltro] = useState(mesAtualStr());
  const [modalCliente, setModalCliente] = useState(false);
  const [modalOS, setModalOS] = useState(false);
  const [modalDespesa, setModalDespesa] = useState(false);
  const [modalEstoque, setModalEstoque] = useState(false);
  const [modalOSDetalhe, setModalOSDetalhe] = useState(null);
  const [modalNome, setModalNome] = useState(false);
  const [modalLogo, setModalLogo] = useState(false);
  const [modalSenha, setModalSenha] = useState(false);
  const [modalTabela, setModalTabela] = useState(false);
  const [clienteDetalhe, setClienteDetalhe] = useState(null);

  const clienteVazio = { nome:"", telefone:"", email:"", cpf:"", veiculos:[] };
  const [clienteForm, setClienteForm] = useState(clienteVazio);
  const [clienteEditId, setClienteEditId] = useState(null);
  const [veiculoTemp, setVeiculoTemp] = useState({ placa:"", modelo:"", cor:"", ano:"" });
  const [showVeiculoForm, setShowVeiculoForm] = useState(false);

  const osVazia = { clienteId:"", veiculoPlaca:"", servicos:[], observacao:"", data:dataHoje(), previsao:"", status:"Aguardando", valorTotal:"", desconto:"0,00", formaPagamento:"PIX" };
  const [osForm, setOsForm] = useState(osVazia);
  const [osEditId, setOsEditId] = useState(null);
  const [servicoOS, setServicoOS] = useState({ nome:"", valor:"", categoria:"" });

  const despesaVazia = { descricao:"", valor:"", data:dataHoje(), categoria:"Produtos" };
  const [despesaForm, setDespesaForm] = useState(despesaVazia);

  const estoqueVazio = { nome:"", unidade:"un", quantidade:"", quantidadeMin:"", custo:"", categoria:"Produto" };
  const [estoqueForm, setEstoqueForm] = useState(estoqueVazio);
  const [estoqueEditId, setEstoqueEditId] = useState(null);

  const [filtroClientes, setFiltroClientes] = useState("");
  const [filtroOS, setFiltroOS] = useState("");
  const [nomeEdit, setNomeEdit] = useState("");
  const [logoInput, setLogoInput] = useState("");
  const [senhaAtual, setSenhaAtual] = useState("");
  const [senhaNova, setSenhaNova] = useState("");
  const [senhaConfirm, setSenhaConfirm] = useState("");
  const [erroSenha, setErroSenha] = useState("");
  const [okSenha, setOkSenha] = useState("");
  const [tabelaEdit, setTabelaEdit] = useState([]);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstall, setShowInstall] = useState(false);

  useEffect(() => {
    const link = document.createElement("link");
    link.href = "https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600;700&family=Barlow+Condensed:wght@700;800;900&display=swap";
    link.rel = "stylesheet";
    document.head.appendChild(link);
  }, []);

  useEffect(() => {
    const h = (e) => { e.preventDefault(); setDeferredPrompt(e); setShowInstall(true); };
    window.addEventListener("beforeinstallprompt", h);
    return () => window.removeEventListener("beforeinstallprompt", h);
  }, []);

  const instalarApp = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setShowInstall(false);
    setDeferredPrompt(null);
  };

  useEffect(() => {
    if (!logado) return;
    setCarregando(true);
    const unsub = onSnapshot(doc(db, "estetica", DOC_ID), (snap) => {
      if (snap.exists()) {
        const d = snap.data();
        if (d.senhaAdmin) setSenhaAdminState(d.senhaAdmin);
        if (d.nomeEstab) setNomeEstabState(d.nomeEstab);
        if (d.logoUrl !== undefined) setLogoUrlState(d.logoUrl || "");
        if (d.clientes) setClientesState(d.clientes);
        if (d.ordens) setOrdensState(d.ordens);
        if (d.despesas) setDespesasState(d.despesas);
        if (d.estoque) setEstoqueState(d.estoque);
        if (d.tabelaServicos) setTabelaServicosState(d.tabelaServicos);
      }
      setCarregando(false);
    });
    return () => unsub();
  }, [logado]);

  const salvarFB = async (campo, valor) => {
    setSalvando(true);
    try { await setDoc(doc(db, "estetica", DOC_ID), { [campo]: valor }, { merge: true }); }
    catch (e) { console.error(e); }
    setSalvando(false);
  };

  const setNomeEstab = (v) => { setNomeEstabState(v); salvarFB("nomeEstab", v); };
  const setSenhaAdmin = (v) => { setSenhaAdminState(v); salvarFB("senhaAdmin", v); };
  const setLogoUrl = (v) => { setLogoUrlState(v); salvarFB("logoUrl", v); };
  const setClientes = (val) => { const n = typeof val==="function"?val(clientes):val; setClientesState(n); salvarFB("clientes", n); };
  const setOrdens = (val) => { const n = typeof val==="function"?val(ordens):val; setOrdensState(n); salvarFB("ordens", n); };
  const setDespesas = (val) => { const n = typeof val==="function"?val(despesas):val; setDespesasState(n); salvarFB("despesas", n); };
  const setEstoque = (val) => { const n = typeof val==="function"?val(estoque):val; setEstoqueState(n); salvarFB("estoque", n); };
  const setTabelaServicos = (val) => { const n = typeof val==="function"?val(tabelaServicos):val; setTabelaServicosState(n); salvarFB("tabelaServicos", n); };

  const entrar = () => {
    if (tipoAcesso === "admin") {
      if (!senhaInput) { setErroLogin("Digite a senha."); return; }
      if (senhaInput !== senhaAdmin) { setErroLogin("Senha incorreta."); return; }
      setIsAdmin(true);
    } else {
      setIsAdmin(false);
    }
    setLogado(true); setErroLogin(""); setSenhaInput("");
  };

  const ordensDoMes = ordens.filter(o => o.data?.startsWith(mesFiltro) && o.status !== "Cancelado");
  const receitaMes = ordensDoMes.reduce((acc, o) => acc + parseDinheiro(o.valorTotal) - parseDinheiro(o.desconto||"0"), 0);
  const despesasMes = despesas.filter(d => d.data?.startsWith(mesFiltro)).reduce((acc, d) => acc + parseDinheiro(d.valor), 0);
  const saldoMes = receitaMes - despesasMes;
  const osPendentes = ordens.filter(o => o.status === "Aguardando" || o.status === "Em Andamento").length;
  const estoqueBaixo = estoque.filter(e => parseFloat(e.quantidade) <= parseFloat(e.quantidadeMin||0));
  const clienteNome = (id) => clientes.find(c => c.id === id)?.nome || "—";

  const salvarCliente = () => {
    if (!clienteForm.nome) return;
    if (clienteEditId) {
      setClientes(clientes.map(c => c.id === clienteEditId ? { ...c, ...clienteForm } : c));
    } else {
      setClientes([...clientes, { ...clienteForm, id: Date.now() }]);
    }
    setModalCliente(false); setClienteForm(clienteVazio); setClienteEditId(null); setShowVeiculoForm(false);
  };

  const adicionarVeiculoCliente = () => {
    if (!veiculoTemp.placa || !veiculoTemp.modelo) return;
    setClienteForm(f => ({ ...f, veiculos: [...(f.veiculos||[]), { ...veiculoTemp, id: Date.now() }] }));
    setVeiculoTemp({ placa:"", modelo:"", cor:"", ano:"" }); setShowVeiculoForm(false);
  };

  const salvarOS = () => {
    if (!osForm.clienteId) return;
    const total = osForm.servicos.reduce((a, s) => a + parseDinheiro(s.valor), 0);
    const osFinal = { ...osForm, valorTotal: maskDinheiro(String(Math.round(total*100))), id: osEditId || Date.now() };
    if (osEditId) { setOrdens(ordens.map(o => o.id === osEditId ? osFinal : o)); }
    else { setOrdens([...ordens, osFinal]); }
    setModalOS(false); setOsForm(osVazia); setOsEditId(null);
  };

  const adicionarServicoOS = () => {
    if (!servicoOS.nome || !servicoOS.valor) return;
    setOsForm(f => ({ ...f, servicos: [...f.servicos, { ...servicoOS, id: Date.now() }] }));
    setServicoOS({ nome:"", valor:"", categoria:"" });
  };

  const salvarDespesa = () => {
    if (!despesaForm.descricao || !despesaForm.valor) return;
    setDespesas([...despesas, { ...despesaForm, id: Date.now() }]);
    setModalDespesa(false); setDespesaForm(despesaVazia);
  };

  const salvarEstoque = () => {
    if (!estoqueForm.nome) return;
    if (estoqueEditId) { setEstoque(estoque.map(e => e.id === estoqueEditId ? { ...e, ...estoqueForm } : e)); }
    else { setEstoque([...estoque, { ...estoqueForm, id: Date.now() }]); }
    setModalEstoque(false); setEstoqueForm(estoqueVazio); setEstoqueEditId(null);
  };

  const trocarSenha = () => {
    if (senhaAtual !== senhaAdmin) { setErroSenha("Senha atual incorreta."); setOkSenha(""); return; }
    if (senhaNova.length < 4) { setErroSenha("Mínimo 4 caracteres."); setOkSenha(""); return; }
    if (senhaNova !== senhaConfirm) { setErroSenha("Senhas não coincidem."); setOkSenha(""); return; }
    setSenhaAdmin(senhaNova); setErroSenha(""); setOkSenha("✅ Senha alterada!");
    setSenhaAtual(""); setSenhaNova(""); setSenhaConfirm("");
  };

  // ── TELA LOGIN ──
  if (!logado) return (
    <div style={{ ...S.page, display:"flex", alignItems:"center", justifyContent:"center", minHeight:"100vh", padding:16, background:"radial-gradient(ellipse at 50% 0%, #00d97e18 0%, #060c18 60%)" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600;700&family=Barlow+Condensed:wght@700;800;900&display=swap'); *{box-sizing:border-box;} body{margin:0;}`}</style>
      <div style={{ width:"100%", maxWidth:400 }}>
        <div style={{ textAlign:"center", marginBottom:32 }}>
          <div style={{ fontSize:72, marginBottom:8 }}>🚗</div>
          <div style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:900, fontSize:52, lineHeight:0.9 }}>
            <span style={{ color:"#00d97e" }}>ECO</span>ACTION
          </div>
          <div style={{ color:"#64748b", fontSize:15, marginTop:8 }}>Gestão de Estética Automotiva</div>
        </div>
        <div style={S.card}>
          <div style={{ display:"flex", gap:8, marginBottom:20 }}>
            {["visitante","admin"].map(t => (
              <button key={t} onClick={() => { setTipoAcesso(t); setErroLogin(""); }} style={{ flex:1, cursor:"pointer", borderRadius:10, border:`2px solid ${tipoAcesso===t?"#00d97e":"#1e2e50"}`, background:tipoAcesso===t?"rgba(0,217,126,0.1)":"transparent", color:tipoAcesso===t?"#00d97e":"#64748b", padding:"10px", fontFamily:"'Barlow', sans-serif", fontWeight:700, fontSize:14 }}>
                {t === "visitante" ? "👁 Visitante" : "🔑 Admin"}
              </button>
            ))}
          </div>
          {tipoAcesso === "admin" && (
            <div style={{ marginBottom:16 }}>
              <label style={S.label}>SENHA</label>
              <div style={{ position:"relative" }}>
                <input style={{ ...S.input, paddingRight:44 }} type={showSenhaLogin?"text":"password"} value={senhaInput} onChange={e => setSenhaInput(e.target.value)} onKeyDown={e => e.key==="Enter" && entrar()} placeholder="Digite a senha..." autoFocus />
                <button onClick={() => setShowSenhaLogin(v => !v)} style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", color:"#64748b", cursor:"pointer", fontSize:18 }}>{showSenhaLogin?"🙈":"👁"}</button>
              </div>
            </div>
          )}
          {erroLogin && <div style={{ background:"rgba(255,71,87,0.1)", border:"1px solid #ff4757", borderRadius:10, padding:12, color:"#ff4757", fontSize:13, marginBottom:12 }}>{erroLogin}</div>}
          <button style={{ ...S.btn("#00d97e"), width:"100%", padding:14, fontSize:16 }} onClick={entrar}>
            {tipoAcesso === "visitante" ? "ENTRAR COMO VISITANTE" : "ENTRAR"}
          </button>
        </div>
      </div>
    </div>
  );

  if (carregando) return (
    <div style={{ ...S.page, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ textAlign:"center" }}><div style={{ fontSize:48, marginBottom:12 }}>🚗</div><div style={{ color:"#64748b" }}>Carregando...</div></div>
    </div>
  );

  const abas = [
    { id:"dashboard", icon:"📊", label:"Dashboard" },
    { id:"clientes", icon:"👥", label:"Clientes" },
    { id:"os", icon:"🔧", label:"Ordens" },
    { id:"financeiro", icon:"💰", label:"Financeiro" },
    { id:"estoque", icon:"📦", label:"Estoque" },
    ...(isAdmin ? [{ id:"config", icon:"⚙️", label:"Config" }] : []),
  ];

  return (
    <ErrorBoundary>
      <div style={{ ...S.page, paddingBottom:80 }}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600;700&family=Barlow+Condensed:wght@700;800;900&display=swap'); *{box-sizing:border-box;} body{margin:0;}`}</style>

        {/* Header */}
        <div style={{ background:"linear-gradient(135deg, #0a0f1e, #111827)", borderBottom:"1px solid #1e2e50", padding:"12px 16px", display:"flex", alignItems:"center", justifyContent:"space-between", position:"sticky", top:0, zIndex:100 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            {logoUrl ? <img src={logoUrl} alt="logo" style={{ width:36, height:36, borderRadius:8, objectFit:"cover" }} /> : <div style={{ width:36, height:36, borderRadius:8, background:"linear-gradient(135deg,#00d97e,#00b865)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20 }}>🚗</div>}
            <div style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:900, fontSize:20 }}>{nomeEstab}</div>
          </div>
          <div style={{ display:"flex", gap:8, alignItems:"center" }}>
            {salvando && <span style={{ fontSize:11, color:"#64748b" }}>💾</span>}
            {showInstall && <button onClick={instalarApp} style={{ ...S.btn("#3b82f6"), padding:"6px 12px", fontSize:12 }}>📲 Instalar</button>}
            <button onClick={() => { setLogado(false); setIsAdmin(false); setAba("dashboard"); }} style={{ ...S.btnGhost, padding:"6px 14px", fontSize:12 }}>Sair</button>
          </div>
        </div>

        {estoqueBaixo.length > 0 && (
          <div style={{ background:"rgba(255,71,87,0.08)", borderBottom:"1px solid #ff475733", padding:"8px 16px" }}>
            <span style={{ fontSize:13, color:"#ff4757" }}>⚠️ Estoque baixo: {estoqueBaixo.map(e => e.nome).join(", ")}</span>
          </div>
        )}

        <div style={{ padding:16, maxWidth:900, margin:"0 auto" }}>
          {aba === "dashboard" && <AbaDashboard receitaMes={receitaMes} despesasMes={despesasMes} saldoMes={saldoMes} osPendentes={osPendentes} clientesAtivos={clientes.length} ordens={ordens} clienteNome={clienteNome} isAdmin={isAdmin} setModalOS={setModalOS} mesFiltro={mesFiltro} setMesFiltro={setMesFiltro} />}
          {aba === "clientes" && <AbaClientes clientes={clientes} setClientes={setClientes} ordens={ordens} filtro={filtroClientes} setFiltro={setFiltroClientes} isAdmin={isAdmin} modalCliente={modalCliente} setModalCliente={setModalCliente} clienteForm={clienteForm} setClienteForm={setClienteForm} clienteEditId={clienteEditId} setClienteEditId={setClienteEditId} salvarCliente={salvarCliente} veiculoTemp={veiculoTemp} setVeiculoTemp={setVeiculoTemp} showVeiculoForm={showVeiculoForm} setShowVeiculoForm={setShowVeiculoForm} adicionarVeiculoCliente={adicionarVeiculoCliente} clienteVazio={clienteVazio} maskTelefone={maskTelefone} clienteDetalhe={clienteDetalhe} setClienteDetalhe={setClienteDetalhe} />}
          {aba === "os" && <AbaOS ordens={ordens} setOrdens={setOrdens} clientes={clientes} tabelaServicos={tabelaServicos} filtro={filtroOS} setFiltro={setFiltroOS} isAdmin={isAdmin} modalOS={modalOS} setModalOS={setModalOS} osForm={osForm} setOsForm={setOsForm} osEditId={osEditId} setOsEditId={setOsEditId} salvarOS={salvarOS} servicoOS={servicoOS} setServicoOS={setServicoOS} adicionarServicoOS={adicionarServicoOS} osVazia={osVazia} maskDinheiro={maskDinheiro} clienteNome={clienteNome} modalOSDetalhe={modalOSDetalhe} setModalOSDetalhe={setModalOSDetalhe} mesFiltro={mesFiltro} setMesFiltro={setMesFiltro} nomeEstab={nomeEstab} />}
          {aba === "financeiro" && <AbaFinanceiro ordens={ordens} despesas={despesas} setDespesas={setDespesas} receitaMes={receitaMes} despesasMes={despesasMes} saldoMes={saldoMes} mesFiltro={mesFiltro} setMesFiltro={setMesFiltro} isAdmin={isAdmin} modalDespesa={modalDespesa} setModalDespesa={setModalDespesa} despesaForm={despesaForm} setDespesaForm={setDespesaForm} salvarDespesa={salvarDespesa} despesaVazia={despesaVazia} clienteNome={clienteNome} maskDinheiro={maskDinheiro} />}
          {aba === "estoque" && <AbaEstoque estoque={estoque} setEstoque={setEstoque} isAdmin={isAdmin} modalEstoque={modalEstoque} setModalEstoque={setModalEstoque} estoqueForm={estoqueForm} setEstoqueForm={setEstoqueForm} estoqueEditId={estoqueEditId} setEstoqueEditId={setEstoqueEditId} salvarEstoque={salvarEstoque} estoqueVazio={estoqueVazio} maskDinheiro={maskDinheiro} />}
          {aba === "config" && isAdmin && <AbaConfig nomeEstab={nomeEstab} setNomeEstab={setNomeEstab} logoUrl={logoUrl} setLogoUrl={setLogoUrl} tabelaServicos={tabelaServicos} setTabelaServicos={setTabelaServicos} modalNome={modalNome} setModalNome={setModalNome} modalLogo={modalLogo} setModalLogo={setModalLogo} modalSenha={modalSenha} setModalSenha={setModalSenha} modalTabela={modalTabela} setModalTabela={setModalTabela} nomeEdit={nomeEdit} setNomeEdit={setNomeEdit} logoInput={logoInput} setLogoInput={setLogoInput} senhaAtual={senhaAtual} setSenhaAtual={setSenhaAtual} senhaNova={senhaNova} setSenhaNova={setSenhaNova} senhaConfirm={senhaConfirm} setSenhaConfirm={setSenhaConfirm} erroSenha={erroSenha} okSenha={okSenha} trocarSenha={trocarSenha} tabelaEdit={tabelaEdit} setTabelaEdit={setTabelaEdit} maskDinheiro={maskDinheiro} />}
        </div>

        <div style={{ position:"fixed", bottom:0, left:0, right:0, background:"#0a0f1e", borderTop:"1px solid #1e2e50", display:"flex", zIndex:100 }}>
          {abas.map(a => (
            <button key={a.id} onClick={() => setAba(a.id)} style={{ flex:1, cursor:"pointer", background:"none", border:"none", padding:"10px 4px 12px", display:"flex", flexDirection:"column", alignItems:"center", gap:2, color:aba===a.id?"#00d97e":"#475569" }}>
              <span style={{ fontSize:20 }}>{a.icon}</span>
              <span style={{ fontSize:10, fontWeight:700, fontFamily:"'Barlow', sans-serif" }}>{a.label}</span>
            </button>
          ))}
        </div>
      </div>
    </ErrorBoundary>
  );
}

// ── DASHBOARD ──
function AbaDashboard({ receitaMes, despesasMes, saldoMes, osPendentes, clientesAtivos, ordens, clienteNome, isAdmin, setModalOS, mesFiltro, setMesFiltro }) {
  const ultimas = [...ordens].sort((a,b) => b.id - a.id).slice(0,5);
  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
        <div><div style={{ ...S.h1, fontSize:28 }}>📊 DASHBOARD</div><div style={{ color:"#64748b", fontSize:13 }}>{nomeMes(mesFiltro)}</div></div>
        <div style={{ display:"flex", gap:8 }}>
          <input type="month" value={mesFiltro} onChange={e => setMesFiltro(e.target.value)} style={{ ...S.input, width:"auto", fontSize:13, padding:"8px 12px" }} />
          {isAdmin && <button onClick={() => setModalOS(true)} style={{ ...S.btn("#00d97e"), padding:"8px 16px", fontSize:13 }}>+ OS</button>}
        </div>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(140px, 1fr))", gap:12, marginBottom:20 }}>
        {[
          { label:"RECEITA", value:fmtDinheiro(receitaMes), color:"#00d97e", icon:"💰" },
          { label:"DESPESAS", value:fmtDinheiro(despesasMes), color:"#ff4757", icon:"📉" },
          { label:"SALDO", value:fmtDinheiro(saldoMes), color:saldoMes>=0?"#00d97e":"#ff4757", icon:"📊" },
          { label:"OS ABERTAS", value:String(osPendentes), color:"#ffba00", icon:"🔧" },
          { label:"CLIENTES", value:String(clientesAtivos), color:"#3b82f6", icon:"👥" },
        ].map(k => (
          <div key={k.label} style={{ ...S.cardSm, textAlign:"center" }}>
            <div style={{ fontSize:26, marginBottom:4 }}>{k.icon}</div>
            <div style={{ fontSize:11, color:"#64748b", fontWeight:700, letterSpacing:1 }}>{k.label}</div>
            <div style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:900, fontSize:20, color:k.color, marginTop:2 }}>{k.value}</div>
          </div>
        ))}
      </div>
      <div style={S.card}>
        <div style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:900, fontSize:18, marginBottom:16 }}>ÚLTIMAS ORDENS</div>
        {ultimas.length === 0 && <p style={{ color:"#64748b", fontSize:14 }}>Nenhuma ordem ainda.</p>}
        {ultimas.map(o => (
          <div key={o.id} style={{ ...S.cardSm, display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:8, marginBottom:8 }}>
            <div>
              <div style={{ fontWeight:700 }}>{clienteNome(o.clienteId)}</div>
              <div style={{ fontSize:12, color:"#64748b" }}>🚗 {o.veiculoPlaca} · {o.data}</div>
              <div style={{ fontSize:12, color:"#94a3b8" }}>{o.servicos?.map(s=>s.nome).join(", ")}</div>
            </div>
            <div style={{ textAlign:"right" }}>
              <span style={S.tag(STATUS_OS_COLOR[o.status]||"#94a3b8")}>{o.status}</span>
              <div style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:900, fontSize:18, color:"#00d97e", marginTop:4 }}>{fmtDinheiro(parseDinheiro(o.valorTotal)-parseDinheiro(o.desconto||"0"))}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── CLIENTES ──
function AbaClientes({ clientes, setClientes, ordens, filtro, setFiltro, isAdmin, modalCliente, setModalCliente, clienteForm, setClienteForm, clienteEditId, setClienteEditId, salvarCliente, veiculoTemp, setVeiculoTemp, showVeiculoForm, setShowVeiculoForm, adicionarVeiculoCliente, clienteVazio, maskTelefone, clienteDetalhe, setClienteDetalhe }) {
  const filtrado = clientes.filter(c => !filtro || c.nome?.toLowerCase().includes(filtro.toLowerCase()) || c.telefone?.includes(filtro));
  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
        <div style={S.h1}>👥 CLIENTES</div>
        {isAdmin && <button onClick={() => { setClienteForm(clienteVazio); setClienteEditId(null); setModalCliente(true); }} style={S.btn("#00d97e")}>+ Cliente</button>}
      </div>
      <input style={{ ...S.input, marginBottom:16 }} placeholder="🔍 Buscar por nome ou telefone..." value={filtro} onChange={e => setFiltro(e.target.value)} />
      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        {filtrado.length === 0 && <p style={{ color:"#64748b" }}>Nenhum cliente encontrado.</p>}
        {filtrado.map(c => {
          const osCliente = ordens.filter(o => o.clienteId === c.id).length;
          return (
            <div key={c.id} style={{ ...S.cardSm, cursor:"pointer" }} onClick={() => setClienteDetalhe(c)}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                <div>
                  <div style={{ fontWeight:700, fontSize:16 }}>{c.nome}</div>
                  {c.telefone && <div style={{ fontSize:13, color:"#64748b" }}>📱 {c.telefone}</div>}
                  {c.email && <div style={{ fontSize:13, color:"#64748b" }}>✉️ {c.email}</div>}
                  {c.veiculos?.length > 0 && <div style={{ fontSize:13, color:"#94a3b8", marginTop:4 }}>🚗 {c.veiculos.map(v=>v.placa).join(", ")}</div>}
                </div>
                <div style={{ textAlign:"right" }}>
                  <span style={S.tag("#3b82f6")}>{osCliente} OS</span>
                  {isAdmin && (
                    <div style={{ display:"flex", gap:6, marginTop:8 }}>
                      <button onClick={e => { e.stopPropagation(); setClienteForm({ nome:c.nome, telefone:c.telefone, email:c.email, cpf:c.cpf, veiculos:c.veiculos||[] }); setClienteEditId(c.id); setModalCliente(true); }} style={{ ...S.btn("#3b82f6"), padding:"5px 10px", fontSize:12 }}>✏️</button>
                      <button onClick={e => { e.stopPropagation(); if(confirm("Remover cliente?")) setClientes(clientes.filter(x=>x.id!==c.id)); }} style={{ ...S.btn("#ff4757"), padding:"5px 10px", fontSize:12 }}>🗑</button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {modalCliente && (
        <div style={S.modal} onClick={() => setModalCliente(false)}>
          <div style={S.modalBox} onClick={e => e.stopPropagation()}>
            <div style={{ ...S.h2, marginBottom:20 }}>{clienteEditId?"✏️ EDITAR CLIENTE":"👤 NOVO CLIENTE"}</div>
            {[["NOME *","nome","text"],["TELEFONE","telefone","tel"],["E-MAIL","email","email"],["CPF","cpf","text"]].map(([lbl,campo,tipo]) => (
              <div key={campo} style={{ marginBottom:12 }}>
                <label style={S.label}>{lbl}</label>
                <input style={S.input} type={tipo} value={clienteForm[campo]||""} onChange={e => setClienteForm(f => ({ ...f, [campo]:campo==="telefone"?maskTelefone(e.target.value):e.target.value }))} />
              </div>
            ))}
            <div style={{ marginBottom:16 }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
                <label style={S.label}>VEÍCULOS</label>
                <button onClick={() => setShowVeiculoForm(v => !v)} style={{ ...S.btn("#3b82f6"), padding:"4px 10px", fontSize:12 }}>+ Veículo</button>
              </div>
              {showVeiculoForm && (
                <div style={{ ...S.cardSm, marginBottom:10 }}>
                  <div style={S.grid2}>
                    {[["PLACA","placa"],["MODELO","modelo"],["COR","cor"],["ANO","ano"]].map(([lbl,campo]) => (
                      <div key={campo}><label style={S.label}>{lbl}</label><input style={S.input} value={veiculoTemp[campo]} onChange={e => setVeiculoTemp(f => ({ ...f, [campo]:e.target.value }))} /></div>
                    ))}
                  </div>
                  <button style={{ ...S.btn("#00d97e"), width:"100%", marginTop:10 }} onClick={adicionarVeiculoCliente}>Adicionar Veículo</button>
                </div>
              )}
              {clienteForm.veiculos?.map(v => (
                <div key={v.id} style={{ ...S.cardSm, display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
                  <span style={{ fontSize:14 }}>🚗 <strong>{v.placa}</strong> · {v.modelo} {v.cor} {v.ano}</span>
                  <button onClick={() => setClienteForm(f => ({ ...f, veiculos:f.veiculos.filter(x=>x.id!==v.id) }))} style={{ background:"none", border:"none", color:"#ff4757", cursor:"pointer", fontSize:18 }}>×</button>
                </div>
              ))}
            </div>
            <div style={{ display:"flex", gap:8 }}>
              <button style={{ ...S.btn("#00d97e"), flex:1 }} onClick={salvarCliente}>SALVAR</button>
              <button style={S.btnGhost} onClick={() => setModalCliente(false)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {clienteDetalhe && (
        <div style={S.modal} onClick={() => setClienteDetalhe(null)}>
          <div style={S.modalBox} onClick={e => e.stopPropagation()}>
            <div style={{ ...S.h2, marginBottom:4 }}>{clienteDetalhe.nome}</div>
            {clienteDetalhe.telefone && <p style={{ color:"#64748b", marginBottom:4 }}>📱 {clienteDetalhe.telefone}</p>}
            {clienteDetalhe.email && <p style={{ color:"#64748b", marginBottom:4 }}>✉️ {clienteDetalhe.email}</p>}
            <div style={{ marginTop:16 }}>
              <div style={{ fontWeight:700, marginBottom:8 }}>Veículos</div>
              {clienteDetalhe.veiculos?.length ? clienteDetalhe.veiculos.map(v => (
                <div key={v.id} style={{ ...S.cardSm, marginBottom:6, fontSize:14 }}>🚗 <strong>{v.placa}</strong> — {v.modelo} {v.cor} {v.ano}</div>
              )) : <p style={{ color:"#64748b", fontSize:13 }}>Nenhum veículo cadastrado.</p>}
            </div>
            <div style={{ marginTop:16 }}>
              <div style={{ fontWeight:700, marginBottom:8 }}>Histórico de OS</div>
              {ordens.filter(o => o.clienteId === clienteDetalhe.id).length === 0
                ? <p style={{ color:"#64748b", fontSize:13 }}>Nenhuma OS.</p>
                : ordens.filter(o => o.clienteId === clienteDetalhe.id).map(o => (
                  <div key={o.id} style={{ ...S.cardSm, marginBottom:6, display:"flex", justifyContent:"space-between", fontSize:13 }}>
                    <span>{o.data} · {o.servicos?.map(s=>s.nome).join(", ")}</span>
                    <span style={S.tag(STATUS_OS_COLOR[o.status]||"#94a3b8")}>{o.status}</span>
                  </div>
                ))
              }
            </div>
            <button style={{ ...S.btnGhost, width:"100%", marginTop:16 }} onClick={() => setClienteDetalhe(null)}>Fechar</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── PDF OS ──
function gerarPDFOS(os, nomeCliente, nomeEstab) {
  const total = parseDinheiro(os.valorTotal) - parseDinheiro(os.desconto||"0");
  const subtotal = parseDinheiro(os.valorTotal);
  const desconto = parseDinheiro(os.desconto||"0");
  const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"/><title>OS - ${nomeEstab}</title>
  <style>*{margin:0;padding:0;box-sizing:border-box;}body{font-family:Arial,sans-serif;padding:32px;color:#111;}
  .header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #00b865;padding-bottom:16px;margin-bottom:24px;}
  .empresa{font-size:26px;font-weight:900;color:#00b865;}.sub{font-size:13px;color:#555;margin-top:4px;}
  .badge{background:#00b865;color:#fff;padding:6px 16px;border-radius:20px;font-weight:700;font-size:13px;}
  .sec{margin-bottom:20px;}.sec-title{font-size:11px;font-weight:700;color:#888;letter-spacing:1px;text-transform:uppercase;margin-bottom:8px;border-bottom:1px solid #eee;padding-bottom:4px;}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;}.item label{font-size:11px;color:#888;display:block;}.item span{font-size:14px;font-weight:600;}
  table{width:100%;border-collapse:collapse;}th{background:#f5f5f5;padding:8px 12px;text-align:left;font-size:12px;color:#555;font-weight:700;}
  td{padding:10px 12px;border-bottom:1px solid #f0f0f0;font-size:14px;}.vr{text-align:right;font-weight:600;}
  .tots{margin-top:16px;border-top:2px solid #eee;padding-top:12px;}.tl{display:flex;justify-content:space-between;padding:4px 0;font-size:14px;color:#555;}
  .tf{display:flex;justify-content:space-between;padding:10px 0;font-size:20px;font-weight:900;color:#00b865;border-top:2px solid #00b865;margin-top:8px;}
  .obs{background:#f9f9f9;border-left:3px solid #00b865;padding:12px 16px;font-size:13px;color:#555;}
  .rodape{margin-top:32px;text-align:center;font-size:11px;color:#aaa;border-top:1px solid #eee;padding-top:16px;}
  @media print{body{padding:16px;}}</style></head><body>
  <div class="header"><div><div class="empresa">🚗 ${nomeEstab}</div><div class="sub">Ordem de Serviço · #${os.id}</div>
  <div class="sub">Emitida em: ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})}</div></div>
  <div class="badge">${os.status}</div></div>
  <div class="sec"><div class="sec-title">Dados do Cliente e Veículo</div><div class="grid">
  <div class="item"><label>CLIENTE</label><span>${nomeCliente}</span></div>
  <div class="item"><label>VEÍCULO / PLACA</label><span>${os.veiculoPlaca||"—"}</span></div>
  <div class="item"><label>DATA DA OS</label><span>${os.data||"—"}</span></div>
  <div class="item"><label>PREVISÃO DE ENTREGA</label><span>${os.previsao||"—"}</span></div>
  <div class="item"><label>FORMA DE PAGAMENTO</label><span>${os.formaPagamento||"—"}</span></div></div></div>
  <div class="sec"><div class="sec-title">Serviços Realizados</div>
  <table><thead><tr><th>Serviço</th><th style="text-align:right">Valor</th></tr></thead><tbody>
  ${(os.servicos||[]).map(s=>`<tr><td>${s.nome}</td><td class="vr">R$ ${s.valor}</td></tr>`).join("")}
  </tbody></table>
  <div class="tots"><div class="tl"><span>Subtotal</span><span>${fmtDinheiro(subtotal)}</span></div>
  ${desconto>0?`<div class="tl" style="color:#e53e3e"><span>Desconto</span><span>- ${fmtDinheiro(desconto)}</span></div>`:""}
  <div class="tf"><span>TOTAL</span><span>${fmtDinheiro(total)}</span></div></div></div>
  ${os.observacao?`<div class="sec"><div class="sec-title">Observações</div><div class="obs">${os.observacao}</div></div>`:""}
  <div class="rodape">${nomeEstab} · Obrigado pela preferência! · ${new Date().getFullYear()}</div>
  </body></html>`;
  const j = window.open("","_blank");
  j.document.write(html); j.document.close(); j.focus();
  setTimeout(() => j.print(), 500);
}

// ── ORDENS DE SERVIÇO ──
function AbaOS({ ordens, setOrdens, clientes, tabelaServicos, filtro, setFiltro, isAdmin, modalOS, setModalOS, osForm, setOsForm, osEditId, setOsEditId, salvarOS, servicoOS, setServicoOS, adicionarServicoOS, osVazia, maskDinheiro, clienteNome, modalOSDetalhe, setModalOSDetalhe, nomeEstab }) {
  const [abaFiltro, setAbaFiltro] = useState("todas");
  const clienteSelecionado = clientes.find(c => c.id === osForm.clienteId);
  const ordensFiltradas = ordens.filter(o => {
    const mF = !filtro || clienteNome(o.clienteId).toLowerCase().includes(filtro.toLowerCase()) || o.veiculoPlaca?.toLowerCase().includes(filtro.toLowerCase());
    const mS = abaFiltro === "todas" || o.status === abaFiltro;
    return mF && mS;
  }).sort((a,b) => b.id - a.id);

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
        <div style={S.h1}>🔧 ORDENS</div>
        {isAdmin && <button onClick={() => { setOsForm(osVazia); setOsEditId(null); setModalOS(true); }} style={S.btn("#00d97e")}>+ OS</button>}
      </div>
      <input style={{ ...S.input, marginBottom:12 }} placeholder="🔍 Buscar por cliente ou placa..." value={filtro} onChange={e => setFiltro(e.target.value)} />
      <div style={{ display:"flex", gap:6, overflowX:"auto", paddingBottom:4, marginBottom:16 }}>
        {["todas","Aguardando","Em Andamento","Pronto","Entregue","Cancelado"].map(s => (
          <button key={s} onClick={() => setAbaFiltro(s)} style={{ cursor:"pointer", border:`2px solid ${abaFiltro===s?(STATUS_OS_COLOR[s]||"#00d97e"):"#1e2e50"}`, borderRadius:20, background:"transparent", color:abaFiltro===s?(STATUS_OS_COLOR[s]||"#00d97e"):"#64748b", padding:"5px 14px", fontFamily:"'Barlow', sans-serif", fontWeight:700, fontSize:12, whiteSpace:"nowrap" }}>
            {s==="todas"?"Todas":s}{s!=="todas"&&` (${ordens.filter(o=>o.status===s).length})`}
          </button>
        ))}
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        {ordensFiltradas.length === 0 && <p style={{ color:"#64748b" }}>Nenhuma OS encontrada.</p>}
        {ordensFiltradas.map(o => (
          <div key={o.id} style={{ ...S.cardSm, cursor:"pointer" }} onClick={() => setModalOSDetalhe(o)}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:8 }}>
              <div>
                <div style={{ fontWeight:700, fontSize:16 }}>{clienteNome(o.clienteId)}</div>
                <div style={{ fontSize:13, color:"#64748b" }}>🚗 {o.veiculoPlaca} · 📅 {o.data}</div>
                <div style={{ fontSize:13, color:"#94a3b8", marginTop:2 }}>{o.servicos?.map(s=>s.nome).join(" + ")}</div>
              </div>
              <div style={{ textAlign:"right" }}>
                <span style={S.tag(STATUS_OS_COLOR[o.status]||"#94a3b8")}>{o.status}</span>
                <div style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:900, fontSize:20, color:"#00d97e", marginTop:4 }}>{fmtDinheiro(parseDinheiro(o.valorTotal)-parseDinheiro(o.desconto||"0"))}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {modalOS && (
        <div style={S.modal} onClick={() => setModalOS(false)}>
          <div style={S.modalBox} onClick={e => e.stopPropagation()}>
            <div style={{ ...S.h2, marginBottom:20 }}>{osEditId?"✏️ EDITAR OS":"🔧 NOVA OS"}</div>
            <div style={{ marginBottom:12 }}>
              <label style={S.label}>CLIENTE *</label>
              <select style={S.input} value={osForm.clienteId} onChange={e => setOsForm(f => ({ ...f, clienteId:parseInt(e.target.value)||e.target.value, veiculoPlaca:"" }))}>
                <option value="">Selecione o cliente...</option>
                {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
            {clienteSelecionado?.veiculos?.length > 0
              ? <div style={{ marginBottom:12 }}><label style={S.label}>VEÍCULO</label>
                  <select style={S.input} value={osForm.veiculoPlaca} onChange={e => setOsForm(f => ({ ...f, veiculoPlaca:e.target.value }))}>
                    <option value="">Selecione...</option>
                    {clienteSelecionado.veiculos.map(v => <option key={v.id} value={v.placa}>{v.placa} — {v.modelo}</option>)}
                  </select></div>
              : <div style={{ marginBottom:12 }}><label style={S.label}>PLACA DO VEÍCULO</label>
                  <input style={S.input} value={osForm.veiculoPlaca} onChange={e => setOsForm(f => ({ ...f, veiculoPlaca:e.target.value.toUpperCase() }))} placeholder="ABC-1234" /></div>
            }
            <div style={{ ...S.grid2, marginBottom:12 }}>
              <div><label style={S.label}>DATA</label><input style={S.input} type="date" value={osForm.data} onChange={e => setOsForm(f => ({ ...f, data:e.target.value }))} /></div>
              <div><label style={S.label}>PREVISÃO ENTREGA</label><input style={S.input} type="date" value={osForm.previsao} onChange={e => setOsForm(f => ({ ...f, previsao:e.target.value }))} /></div>
            </div>
            <div style={{ marginBottom:12 }}>
              <label style={S.label}>SERVIÇOS</label>
              <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:8 }}>
                {tabelaServicos.map(ts => (
                  <button key={ts.id} onClick={() => setServicoOS({ nome:ts.nome, valor:ts.preco, categoria:ts.nome })} style={{ cursor:"pointer", borderRadius:8, border:"1px solid #1e2e50", background:"rgba(59,130,246,0.08)", color:"#3b82f6", padding:"4px 10px", fontSize:12, fontFamily:"'Barlow', sans-serif", fontWeight:600 }}>
                    {ts.nome} · R${ts.preco}
                  </button>
                ))}
              </div>
              <div style={{ display:"flex", gap:8, marginBottom:8 }}>
                <input style={{ ...S.input, flex:2 }} placeholder="Nome do serviço" value={servicoOS.nome} onChange={e => setServicoOS(f => ({ ...f, nome:e.target.value }))} />
                <input style={{ ...S.input, flex:1 }} placeholder="Valor" value={servicoOS.valor} onChange={e => setServicoOS(f => ({ ...f, valor:maskDinheiro(e.target.value) }))} />
                <button onClick={adicionarServicoOS} style={{ ...S.btn("#00d97e"), padding:"10px 14px", flexShrink:0 }}>+</button>
              </div>
              {osForm.servicos.map(s => (
                <div key={s.id} style={{ ...S.cardSm, display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6, padding:"8px 12px" }}>
                  <span style={{ fontSize:14 }}>{s.nome}</span>
                  <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                    <span style={{ color:"#00d97e", fontWeight:700 }}>R$ {s.valor}</span>
                    <button onClick={() => setOsForm(f => ({ ...f, servicos:f.servicos.filter(x=>x.id!==s.id) }))} style={{ background:"none", border:"none", color:"#ff4757", cursor:"pointer", fontSize:18 }}>×</button>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ ...S.grid2, marginBottom:12 }}>
              <div><label style={S.label}>DESCONTO (R$)</label><input style={S.input} value={osForm.desconto} onChange={e => setOsForm(f => ({ ...f, desconto:maskDinheiro(e.target.value) }))} placeholder="0,00" /></div>
              <div><label style={S.label}>PAGAMENTO</label>
                <select style={S.input} value={osForm.formaPagamento} onChange={e => setOsForm(f => ({ ...f, formaPagamento:e.target.value }))}>
                  {["PIX","Dinheiro","Cartão Crédito","Cartão Débito","Boleto"].map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
            </div>
            <div style={{ marginBottom:12 }}>
              <label style={S.label}>STATUS</label>
              <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                {STATUS_OS.map(s => (
                  <button key={s} onClick={() => setOsForm(f => ({ ...f, status:s }))} style={{ cursor:"pointer", border:`2px solid ${osForm.status===s?(STATUS_OS_COLOR[s]||"#00d97e"):"#1e2e50"}`, borderRadius:20, background:"transparent", color:osForm.status===s?(STATUS_OS_COLOR[s]||"#00d97e"):"#64748b", padding:"5px 12px", fontFamily:"'Barlow', sans-serif", fontWeight:700, fontSize:12 }}>{s}</button>
                ))}
              </div>
            </div>
            <div style={{ marginBottom:16 }}>
              <label style={S.label}>OBSERVAÇÕES</label>
              <textarea style={{ ...S.input, minHeight:60, resize:"vertical" }} value={osForm.observacao} onChange={e => setOsForm(f => ({ ...f, observacao:e.target.value }))} />
            </div>
            {osForm.servicos.length > 0 && (
              <div style={{ ...S.cardSm, marginBottom:16, background:"rgba(0,217,126,0.06)", border:"1px solid #00d97e33" }}>
                <div style={{ display:"flex", justifyContent:"space-between", fontSize:14, color:"#64748b", marginBottom:4 }}><span>Subtotal</span><span>{fmtDinheiro(osForm.servicos.reduce((a,s)=>a+parseDinheiro(s.valor),0))}</span></div>
                {parseDinheiro(osForm.desconto)>0 && <div style={{ display:"flex", justifyContent:"space-between", fontSize:14, color:"#ff4757", marginBottom:4 }}><span>Desconto</span><span>- {fmtDinheiro(parseDinheiro(osForm.desconto))}</span></div>}
                <div style={{ display:"flex", justifyContent:"space-between", fontWeight:700, color:"#00d97e" }}><span>TOTAL</span><span style={{ fontFamily:"'Barlow Condensed', sans-serif", fontSize:20 }}>{fmtDinheiro(osForm.servicos.reduce((a,s)=>a+parseDinheiro(s.valor),0)-parseDinheiro(osForm.desconto||"0"))}</span></div>
              </div>
            )}
            <div style={{ display:"flex", gap:8 }}>
              <button style={{ ...S.btn("#00d97e"), flex:1 }} onClick={salvarOS}>SALVAR OS</button>
              <button style={S.btnGhost} onClick={() => setModalOS(false)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {modalOSDetalhe && (
        <div style={S.modal} onClick={() => setModalOSDetalhe(null)}>
          <div style={S.modalBox} onClick={e => e.stopPropagation()}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
              <div style={S.h2}>OS #{modalOSDetalhe.id}</div>
              <span style={S.tag(STATUS_OS_COLOR[modalOSDetalhe.status]||"#94a3b8")}>{modalOSDetalhe.status}</span>
            </div>
            <div style={{ ...S.cardSm, marginBottom:12 }}>
              <div style={{ fontSize:16, fontWeight:700 }}>{clienteNome(modalOSDetalhe.clienteId)}</div>
              <div style={{ fontSize:13, color:"#64748b" }}>🚗 {modalOSDetalhe.veiculoPlaca}</div>
              <div style={{ fontSize:13, color:"#64748b" }}>📅 {modalOSDetalhe.data}{modalOSDetalhe.previsao&&` → Entrega: ${modalOSDetalhe.previsao}`}</div>
              <div style={{ fontSize:13, color:"#64748b" }}>💳 {modalOSDetalhe.formaPagamento}</div>
            </div>
            <div style={{ marginBottom:12 }}>
              {modalOSDetalhe.servicos?.map(s => (
                <div key={s.id} style={{ display:"flex", justifyContent:"space-between", padding:"6px 0", borderBottom:"1px solid #1e2e50", fontSize:14 }}>
                  <span>{s.nome}</span><span style={{ color:"#00d97e" }}>R$ {s.valor}</span>
                </div>
              ))}
              {parseDinheiro(modalOSDetalhe.desconto)>0 && (
                <div style={{ display:"flex", justifyContent:"space-between", padding:"6px 0", fontSize:14, color:"#ff4757" }}>
                  <span>Desconto</span><span>- R$ {modalOSDetalhe.desconto}</span>
                </div>
              )}
              <div style={{ display:"flex", justifyContent:"space-between", padding:"8px 0", fontWeight:700, color:"#00d97e", fontFamily:"'Barlow Condensed', sans-serif", fontSize:20 }}>
                <span>TOTAL</span><span>{fmtDinheiro(parseDinheiro(modalOSDetalhe.valorTotal)-parseDinheiro(modalOSDetalhe.desconto||"0"))}</span>
              </div>
            </div>
            {modalOSDetalhe.observacao && <div style={{ ...S.cardSm, marginBottom:12, fontSize:13, color:"#94a3b8" }}>📝 {modalOSDetalhe.observacao}</div>}
            {isAdmin && (
              <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:12 }}>
                {STATUS_OS.map(s => (
                  <button key={s} onClick={() => { setOrdens(ordens.map(o => o.id===modalOSDetalhe.id?{...o,status:s}:o)); setModalOSDetalhe({...modalOSDetalhe,status:s}); }} style={{ cursor:"pointer", border:`2px solid ${modalOSDetalhe.status===s?(STATUS_OS_COLOR[s]||"#00d97e"):"#1e2e50"}`, borderRadius:20, background:"transparent", color:modalOSDetalhe.status===s?(STATUS_OS_COLOR[s]||"#00d97e"):"#64748b", padding:"5px 12px", fontFamily:"'Barlow', sans-serif", fontWeight:700, fontSize:12 }}>{s}</button>
                ))}
              </div>
            )}
            <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
              {isAdmin && <button style={{ ...S.btn("#3b82f6"), flex:1 }} onClick={() => { setOsForm({ clienteId:modalOSDetalhe.clienteId, veiculoPlaca:modalOSDetalhe.veiculoPlaca, servicos:modalOSDetalhe.servicos||[], observacao:modalOSDetalhe.observacao||"", data:modalOSDetalhe.data, previsao:modalOSDetalhe.previsao||"", status:modalOSDetalhe.status, valorTotal:modalOSDetalhe.valorTotal, desconto:modalOSDetalhe.desconto||"0,00", formaPagamento:modalOSDetalhe.formaPagamento||"PIX" }); setOsEditId(modalOSDetalhe.id); setModalOSDetalhe(null); setModalOS(true); }}>✏️ Editar</button>}
              <button style={{ ...S.btn("#f59e0b"), flex:1 }} onClick={() => gerarPDFOS(modalOSDetalhe, clienteNome(modalOSDetalhe.clienteId), nomeEstab)}>🖨️ Imprimir OS</button>
              {isAdmin && <button style={S.btn("#ff4757")} onClick={() => { if(confirm("Excluir OS?")){ setOrdens(ordens.filter(o=>o.id!==modalOSDetalhe.id)); setModalOSDetalhe(null); } }}>🗑</button>}
              <button style={S.btnGhost} onClick={() => setModalOSDetalhe(null)}>Fechar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── FINANCEIRO ──
function AbaFinanceiro({ ordens, despesas, setDespesas, receitaMes, despesasMes, saldoMes, mesFiltro, setMesFiltro, isAdmin, modalDespesa, setModalDespesa, despesaForm, setDespesaForm, salvarDespesa, despesaVazia, clienteNome, maskDinheiro }) {
  const ordensDoMes = ordens.filter(o => o.data?.startsWith(mesFiltro) && o.status !== "Cancelado");
  const despesasDoMes = despesas.filter(d => d.data?.startsWith(mesFiltro));
  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
        <div><div style={S.h1}>💰 FINANCEIRO</div><div style={{ color:"#64748b", fontSize:13 }}>{nomeMes(mesFiltro)}</div></div>
        <div style={{ display:"flex", gap:8 }}>
          <input type="month" value={mesFiltro} onChange={e => setMesFiltro(e.target.value)} style={{ ...S.input, width:"auto", fontSize:13, padding:"8px 12px" }} />
          {isAdmin && <button onClick={() => { setDespesaForm(despesaVazia); setModalDespesa(true); }} style={{ ...S.btn("#ff4757"), padding:"8px 14px", fontSize:13 }}>+ Despesa</button>}
        </div>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12, marginBottom:20 }}>
        {[{ label:"RECEITA", value:fmtDinheiro(receitaMes), color:"#00d97e" },{ label:"DESPESAS", value:fmtDinheiro(despesasMes), color:"#ff4757" },{ label:"SALDO", value:fmtDinheiro(saldoMes), color:saldoMes>=0?"#00d97e":"#ff4757" }].map(k => (
          <div key={k.label} style={{ ...S.cardSm, textAlign:"center" }}>
            <div style={{ fontSize:11, color:"#64748b", fontWeight:700, letterSpacing:1 }}>{k.label}</div>
            <div style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:900, fontSize:20, color:k.color, marginTop:4 }}>{k.value}</div>
          </div>
        ))}
      </div>
      <div style={{ ...S.card, marginBottom:16 }}>
        <div style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:900, fontSize:18, marginBottom:12, color:"#00d97e" }}>💰 RECEITAS ({ordensDoMes.length})</div>
        {ordensDoMes.length===0 && <p style={{ color:"#64748b", fontSize:14 }}>Nenhuma receita neste mês.</p>}
        {ordensDoMes.map(o => (
          <div key={o.id} style={{ display:"flex", justifyContent:"space-between", padding:"8px 0", borderBottom:"1px solid #1e2e50", fontSize:14 }}>
            <div><div style={{ fontWeight:600 }}>{clienteNome(o.clienteId)}</div><div style={{ fontSize:12, color:"#64748b" }}>{o.servicos?.map(s=>s.nome).join(", ")} · {o.formaPagamento}</div></div>
            <span style={{ color:"#00d97e", fontWeight:700, fontFamily:"'Barlow Condensed', sans-serif", fontSize:17 }}>{fmtDinheiro(parseDinheiro(o.valorTotal)-parseDinheiro(o.desconto||"0"))}</span>
          </div>
        ))}
      </div>
      <div style={S.card}>
        <div style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:900, fontSize:18, marginBottom:12, color:"#ff4757" }}>📉 DESPESAS ({despesasDoMes.length})</div>
        {despesasDoMes.length===0 && <p style={{ color:"#64748b", fontSize:14 }}>Nenhuma despesa neste mês.</p>}
        {despesasDoMes.map(d => (
          <div key={d.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 0", borderBottom:"1px solid #1e2e50", fontSize:14 }}>
            <div><div style={{ fontWeight:600 }}>{d.descricao}</div><div style={{ fontSize:12, color:"#64748b" }}>{d.categoria} · {d.data}</div></div>
            <div style={{ display:"flex", gap:8, alignItems:"center" }}>
              <span style={{ color:"#ff4757", fontWeight:700, fontFamily:"'Barlow Condensed', sans-serif", fontSize:17 }}>{fmtDinheiro(parseDinheiro(d.valor))}</span>
              {isAdmin && <button onClick={() => { if(confirm("Remover despesa?")) setDespesas(despesas.filter(x=>x.id!==d.id)); }} style={{ background:"none", border:"none", color:"#ff4757", cursor:"pointer", fontSize:18 }}>×</button>}
            </div>
          </div>
        ))}
      </div>
      {modalDespesa && (
        <div style={S.modal} onClick={() => setModalDespesa(false)}>
          <div style={S.modalBox} onClick={e => e.stopPropagation()}>
            <div style={{ ...S.h2, marginBottom:20 }}>📉 NOVA DESPESA</div>
            <div style={{ marginBottom:12 }}><label style={S.label}>DESCRIÇÃO *</label><input style={S.input} value={despesaForm.descricao} onChange={e => setDespesaForm(f => ({ ...f, descricao:e.target.value }))} /></div>
            <div style={{ ...S.grid2, marginBottom:12 }}>
              <div><label style={S.label}>VALOR (R$) *</label><input style={S.input} value={despesaForm.valor} onChange={e => setDespesaForm(f => ({ ...f, valor:maskDinheiro(e.target.value) }))} placeholder="0,00" /></div>
              <div><label style={S.label}>DATA</label><input style={S.input} type="date" value={despesaForm.data} onChange={e => setDespesaForm(f => ({ ...f, data:e.target.value }))} /></div>
            </div>
            <div style={{ marginBottom:20 }}><label style={S.label}>CATEGORIA</label>
              <select style={S.input} value={despesaForm.categoria} onChange={e => setDespesaForm(f => ({ ...f, categoria:e.target.value }))}>
                {CATEGORIAS_DESPESA.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div style={{ display:"flex", gap:8 }}>
              <button style={{ ...S.btn("#ff4757"), flex:1 }} onClick={salvarDespesa}>SALVAR</button>
              <button style={S.btnGhost} onClick={() => setModalDespesa(false)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── ESTOQUE ──
function AbaEstoque({ estoque, setEstoque, isAdmin, modalEstoque, setModalEstoque, estoqueForm, setEstoqueForm, estoqueEditId, setEstoqueEditId, salvarEstoque, estoqueVazio, maskDinheiro }) {
  const baixo = estoque.filter(e => parseFloat(e.quantidade) <= parseFloat(e.quantidadeMin||0));
  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
        <div style={S.h1}>📦 ESTOQUE</div>
        {isAdmin && <button onClick={() => { setEstoqueForm(estoqueVazio); setEstoqueEditId(null); setModalEstoque(true); }} style={S.btn("#3b82f6")}>+ Produto</button>}
      </div>
      {baixo.length > 0 && (
        <div style={{ ...S.cardSm, marginBottom:16, background:"rgba(255,71,87,0.08)", border:"1px solid #ff475733" }}>
          <div style={{ fontWeight:700, color:"#ff4757", marginBottom:6 }}>⚠️ ESTOQUE BAIXO</div>
          {baixo.map(e => <div key={e.id} style={{ fontSize:13, color:"#ff4757" }}>{e.nome}: {e.quantidade} {e.unidade} (mín: {e.quantidadeMin})</div>)}
        </div>
      )}
      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        {estoque.length===0 && <p style={{ color:"#64748b" }}>Nenhum produto cadastrado.</p>}
        {estoque.map(e => {
          const isLow = parseFloat(e.quantidade)<=parseFloat(e.quantidadeMin||0);
          return (
            <div key={e.id} style={{ ...S.cardSm, border:`1px solid ${isLow?"#ff475733":"#1e2e50"}` }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                <div>
                  <div style={{ fontWeight:700, fontSize:15 }}>{e.nome}</div>
                  <div style={{ fontSize:13, color:"#64748b" }}>{e.categoria}{e.custo?` · Custo: R$ ${e.custo}`:""}</div>
                </div>
                <div style={{ textAlign:"right" }}>
                  <span style={S.tag(isLow?"#ff4757":"#00d97e")}>{e.quantidade} {e.unidade}</span>
                  {parseFloat(e.quantidadeMin)>0 && <div style={{ fontSize:11, color:"#64748b", marginTop:2 }}>mín: {e.quantidadeMin}</div>}
                  {isAdmin && (
                    <div style={{ display:"flex", gap:6, marginTop:8 }}>
                      <button onClick={() => { setEstoqueForm({ nome:e.nome, unidade:e.unidade, quantidade:e.quantidade, quantidadeMin:e.quantidadeMin, custo:e.custo, categoria:e.categoria }); setEstoqueEditId(e.id); setModalEstoque(true); }} style={{ ...S.btn("#3b82f6"), padding:"5px 10px", fontSize:12 }}>✏️</button>
                      <button onClick={() => { if(confirm("Remover?")) setEstoque(estoque.filter(x=>x.id!==e.id)); }} style={{ ...S.btn("#ff4757"), padding:"5px 10px", fontSize:12 }}>🗑</button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {modalEstoque && (
        <div style={S.modal} onClick={() => setModalEstoque(false)}>
          <div style={S.modalBox} onClick={e => e.stopPropagation()}>
            <div style={{ ...S.h2, marginBottom:20 }}>{estoqueEditId?"✏️ EDITAR PRODUTO":"📦 NOVO PRODUTO"}</div>
            <div style={{ marginBottom:12 }}><label style={S.label}>NOME *</label><input style={S.input} value={estoqueForm.nome} onChange={e => setEstoqueForm(f => ({ ...f, nome:e.target.value }))} /></div>
            <div style={{ ...S.grid2, marginBottom:12 }}>
              <div><label style={S.label}>UNIDADE</label>
                <select style={S.input} value={estoqueForm.unidade} onChange={e => setEstoqueForm(f => ({ ...f, unidade:e.target.value }))}>
                  {["un","L","ml","kg","g","m","rolo","caixa","par"].map(u => <option key={u}>{u}</option>)}
                </select>
              </div>
              <div><label style={S.label}>CATEGORIA</label>
                <select style={S.input} value={estoqueForm.categoria} onChange={e => setEstoqueForm(f => ({ ...f, categoria:e.target.value }))}>
                  {["Produto","Equipamento","EPI","Descartável","Outros"].map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div><label style={S.label}>QUANTIDADE</label><input style={S.input} type="number" value={estoqueForm.quantidade} onChange={e => setEstoqueForm(f => ({ ...f, quantidade:e.target.value }))} /></div>
              <div><label style={S.label}>QTD MÍNIMA</label><input style={S.input} type="number" value={estoqueForm.quantidadeMin} onChange={e => setEstoqueForm(f => ({ ...f, quantidadeMin:e.target.value }))} /></div>
              <div style={{ gridColumn:"1/-1" }}><label style={S.label}>CUSTO UNITÁRIO (R$)</label><input style={S.input} value={estoqueForm.custo} onChange={e => setEstoqueForm(f => ({ ...f, custo:maskDinheiro(e.target.value) }))} placeholder="0,00" /></div>
            </div>
            <div style={{ display:"flex", gap:8 }}>
              <button style={{ ...S.btn("#3b82f6"), flex:1 }} onClick={salvarEstoque}>SALVAR</button>
              <button style={S.btnGhost} onClick={() => setModalEstoque(false)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── CONFIG ──
function AbaConfig({ nomeEstab, setNomeEstab, logoUrl, setLogoUrl, tabelaServicos, setTabelaServicos, modalNome, setModalNome, modalLogo, setModalLogo, modalSenha, setModalSenha, modalTabela, setModalTabela, nomeEdit, setNomeEdit, logoInput, setLogoInput, senhaAtual, setSenhaAtual, senhaNova, setSenhaNova, senhaConfirm, setSenhaConfirm, erroSenha, okSenha, trocarSenha, tabelaEdit, setTabelaEdit, maskDinheiro }) {
  return (
    <div>
      <div style={{ ...S.h1, marginBottom:20 }}>⚙️ CONFIGURAÇÕES</div>
      {[
        { label:"✏️ NOME DO ESTABELECIMENTO", sub:nomeEstab, action:() => { setNomeEdit(nomeEstab); setModalNome(true); } },
        { label:"🖼️ LOGO / AVATAR", sub:logoUrl||"Nenhuma logo definida", action:() => { setLogoInput(logoUrl); setModalLogo(true); } },
        { label:"💲 TABELA DE SERVIÇOS", sub:`${tabelaServicos.length} serviços cadastrados`, action:() => { setTabelaEdit([...tabelaServicos]); setModalTabela(true); } },
        { label:"🔑 ALTERAR SENHA", sub:"Troque a senha de administrador", action:() => setModalSenha(true) },
      ].map(item => (
        <div key={item.label} onClick={item.action} style={{ ...S.cardSm, marginBottom:10, cursor:"pointer", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div><div style={{ fontWeight:700, fontSize:15 }}>{item.label}</div><div style={{ fontSize:13, color:"#64748b", marginTop:2 }}>{item.sub}</div></div>
          <span style={{ color:"#3b82f6", fontSize:20 }}>›</span>
        </div>
      ))}
      {modalNome && (
        <div style={S.modal} onClick={() => setModalNome(false)}>
          <div style={S.modalBox} onClick={e => e.stopPropagation()}>
            <div style={{ ...S.h2, marginBottom:16 }}>✏️ NOME DO ESTABELECIMENTO</div>
            <input style={{ ...S.input, marginBottom:16 }} value={nomeEdit} onChange={e => setNomeEdit(e.target.value.toUpperCase())} />
            <div style={{ display:"flex", gap:8 }}>
              <button style={{ ...S.btn("#00d97e"), flex:1 }} onClick={() => { setNomeEstab(nomeEdit); setModalNome(false); }}>SALVAR</button>
              <button style={S.btnGhost} onClick={() => setModalNome(false)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
      {modalLogo && (
        <div style={S.modal} onClick={() => setModalLogo(false)}>
          <div style={S.modalBox} onClick={e => e.stopPropagation()}>
            <div style={{ ...S.h2, marginBottom:16 }}>🖼️ LOGO</div>
            <label style={S.label}>URL DA IMAGEM</label>
            <input style={{ ...S.input, marginBottom:8 }} value={logoInput} onChange={e => setLogoInput(e.target.value)} placeholder="https://..." />
            {logoInput && <img src={logoInput} alt="preview" style={{ width:80, height:80, borderRadius:12, objectFit:"cover", marginBottom:12, display:"block" }} onError={e => e.target.style.display="none"} />}
            <div style={{ display:"flex", gap:8 }}>
              <button style={{ ...S.btn("#00d97e"), flex:1 }} onClick={() => { setLogoUrl(logoInput); setModalLogo(false); }}>SALVAR</button>
              <button style={S.btn("#ff4757")} onClick={() => { setLogoUrl(""); setLogoInput(""); setModalLogo(false); }}>Remover</button>
            </div>
          </div>
        </div>
      )}
      {modalTabela && (
        <div style={S.modal} onClick={() => setModalTabela(false)}>
          <div style={S.modalBox} onClick={e => e.stopPropagation()}>
            <div style={{ ...S.h2, marginBottom:16 }}>💲 TABELA DE SERVIÇOS</div>
            {tabelaEdit.map((ts, i) => (
              <div key={ts.id} style={{ display:"flex", gap:8, marginBottom:8, alignItems:"center" }}>
                <input style={{ ...S.input, flex:2 }} value={ts.nome} onChange={e => setTabelaEdit(t => t.map((x,j) => j===i?{...x,nome:e.target.value}:x))} placeholder="Nome do serviço" />
                <input style={{ ...S.input, flex:1 }} value={ts.preco} onChange={e => setTabelaEdit(t => t.map((x,j) => j===i?{...x,preco:maskDinheiro(e.target.value)}:x))} placeholder="0,00" />
                <button onClick={() => setTabelaEdit(t => t.filter((_,j) => j!==i))} style={{ background:"none", border:"none", color:"#ff4757", cursor:"pointer", fontSize:22 }}>×</button>
              </div>
            ))}
            <button onClick={() => setTabelaEdit(t => [...t, { id:Date.now(), nome:"", preco:"" }])} style={{ ...S.btnGhost, width:"100%", marginBottom:16, marginTop:4 }}>+ Adicionar Serviço</button>
            <div style={{ display:"flex", gap:8 }}>
              <button style={{ ...S.btn("#00d97e"), flex:1 }} onClick={() => { setTabelaServicos(tabelaEdit); setModalTabela(false); }}>SALVAR</button>
              <button style={S.btnGhost} onClick={() => setModalTabela(false)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
      {modalSenha && (
        <div style={S.modal} onClick={() => setModalSenha(false)}>
          <div style={S.modalBox} onClick={e => e.stopPropagation()}>
            <div style={{ ...S.h2, marginBottom:20 }}>🔑 ALTERAR SENHA</div>
            {[["SENHA ATUAL",senhaAtual,setSenhaAtual],["NOVA SENHA",senhaNova,setSenhaNova],["CONFIRMAR",senhaConfirm,setSenhaConfirm]].map(([lbl,val,set]) => (
              <div key={lbl} style={{ marginBottom:12 }}>
                <label style={S.label}>{lbl}</label>
                <input style={S.input} type="password" value={val} onChange={e => set(e.target.value)} />
              </div>
            ))}
            {erroSenha && <div style={{ color:"#ff4757", fontSize:13, marginBottom:8 }}>{erroSenha}</div>}
            {okSenha && <div style={{ color:"#00d97e", fontSize:13, marginBottom:8 }}>{okSenha}</div>}
            <div style={{ display:"flex", gap:8 }}>
              <button style={{ ...S.btn("#00d97e"), flex:1 }} onClick={trocarSenha}>ALTERAR</button>
              <button style={S.btnGhost} onClick={() => setModalSenha(false)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
