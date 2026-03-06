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

// ─── Helpers ────────────────────────────────────────────────────────────────
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
const SENHA_MASTER = "EcoMaster@2025";

// ─── Estilos base ────────────────────────────────────────────────────────────
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
  row: { display:"flex", gap:12, alignItems:"center" },
  grid2: { display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 },
};

// ─── ErrorBoundary ────────────────────────────────────────────────────────────
class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError() { return { hasError: false }; }
  componentDidCatch(error, info) { console.error(error, info); }
  render() { return this.props.children; }
}

// ════════════════════════════════════════════════════════════════════════════
export default function App() {
  // ── Auth state ──
  const [telaLanding, setTelaLanding] = useState(true);
  const [telaLogin, setTelaLogin] = useState(false);
  const [telaCadastro, setTelaCadastro] = useState(false);
  const [telaGruposMaster, setTelaGruposMaster] = useState(false);

  const [estabelecimentoId, setEstabelecimentoId] = useState("");
  const [idInput, setIdInput] = useState("");
  const [senhaInput, setSenhaInput] = useState("");
  const [tipoAcesso, setTipoAcesso] = useState("visitante");
  const [isAdmin, setIsAdmin] = useState(false);
  const [isMaster, setIsMaster] = useState(false);
  const [senha, setSenha] = useState("");
  const [erroLogin, setErroLogin] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [showSenhaLogin, setShowSenhaLogin] = useState(false);

  const [cadastroForm, setCadastroForm] = useState({ nome: "", responsavel: "", telefone: "", email: "", codigo: "" });
  const [erroCadastro, setErroCadastro] = useState("");
  const [okCadastro, setOkCadastro] = useState("");

  const [gruposLista, setGruposLista] = useState([]);
  const [carregandoGrupos, setCarregandoGrupos] = useState(false);
  const [editandoPlano, setEditandoPlano] = useState(null);
  const [planoEdit, setPlanoEdit] = useState({ tipo:"degustacao", dias:30, limite:10 });

  // ── Dados Firebase ──
  const [senhaAdmin, setSenhaAdminState] = useState("admin123");
  const [nomeEstab, setNomeEstabState] = useState("ECOESTÉTICA");
  const [logoUrl, setLogoUrlState] = useState("");
  const [plano, setPlanoState] = useState("degustacao");
  const [dataExpiracao, setDataExpiracaoState] = useState(null);
  const [limiteClientesCustom, setLimiteClientesCustom] = useState(15);
  const [clientes, setClientesState] = useState([]);
  const [ordens, setOrdensState] = useState([]);
  const [despesas, setDespesasState] = useState([]);
  const [estoque, setEstoqueState] = useState([]);
  const [avisos, setAvisosState] = useState([]);
  const [tabelaServicos, setTabelaServicosState] = useState([
    { id:1, nome:"Lavagem Completa", preco:"80,00" },
    { id:2, nome:"Polimento", preco:"250,00" },
    { id:3, nome:"Cristalização Cerâmica", preco:"600,00" },
    { id:4, nome:"Higienização Interna", preco:"150,00" },
  ]);

  // ── UI ──
  const [aba, setAba] = useState("dashboard");
  const [mesFiltro, setMesFiltro] = useState(mesAtualStr());
  const [showUpgrade, setShowUpgrade] = useState(false);

  // Modais
  const [modalCliente, setModalCliente] = useState(false);
  const [modalOS, setModalOS] = useState(false);
  const [modalDespesa, setModalDespesa] = useState(false);
  const [modalEstoque, setModalEstoque] = useState(false);
  const [modalAviso, setModalAviso] = useState(false);
  const [modalLogo, setModalLogo] = useState(false);
  const [modalNome, setModalNome] = useState(false);
  const [modalSenha, setModalSenha] = useState(false);
  const [modalTabela, setModalTabela] = useState(false);
  const [modalOSDetalhe, setModalOSDetalhe] = useState(null);

  // Forms
  const clienteVazio = { nome:"", telefone:"", email:"", cpf:"", veiculos:[] };
  const [clienteForm, setClienteForm] = useState(clienteVazio);
  const [clienteEditId, setClienteEditId] = useState(null);
  const [veiculoTemp, setVeiculoTemp] = useState({ placa:"", modelo:"", cor:"", ano:"" });
  const [showVeiculoForm, setShowVeiculoForm] = useState(false);

  const osVazia = { clienteId:"", veiculoPlaca:"", servicos:[], observacao:"", data: dataHoje(), previsao:"", status:"Aguardando", valorTotal:"", desconto:"0,00", formaPagamento:"PIX" };
  const [osForm, setOsForm] = useState(osVazia);
  const [osEditId, setOsEditId] = useState(null);
  const [servicoOS, setServicoOS] = useState({ nome:"", valor:"", categoria:"Lavagem Completa" });

  const despesaVazia = { descricao:"", valor:"", data: dataHoje(), categoria:"Produtos" };
  const [despesaForm, setDespesaForm] = useState(despesaVazia);

  const estoqueVazio = { nome:"", unidade:"un", quantidade:"", quantidadeMin:"", custo:"", categoria:"Produto" };
  const [estoqueForm, setEstoqueForm] = useState(estoqueVazio);
  const [estoqueEditId, setEstoqueEditId] = useState(null);

  const [avisoTexto, setAvisoTexto] = useState("");
  const [avisoUrgente, setAvisoUrgente] = useState(false);
  const [nomeEdit, setNomeEdit] = useState("");
  const [logoInput, setLogoInput] = useState("");
  const [senhaAtual, setSenhaAtual] = useState("");
  const [senhaNova, setSenhaNova] = useState("");
  const [senhaConfirm, setSenhaConfirm] = useState("");
  const [erroSenha, setErroSenha] = useState("");
  const [okSenha, setOkSenha] = useState("");
  const [tabelaEdit, setTabelaEdit] = useState([]);
  const [filtroClientes, setFiltroClientes] = useState("");
  const [filtroOS, setFiltroOS] = useState("");

  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstall, setShowInstall] = useState(false);

  // ── Firebase: carregar dados ──
  useEffect(() => {
    if (!estabelecimentoId) return;
    setCarregando(true);
    const unsub = onSnapshot(doc(db, "estetica", estabelecimentoId), (snap) => {
      if (snap.exists()) {
        const d = snap.data();
        const status = d.status || "ativo";
        if (status === "pendente" && !isMaster) {
          setCarregando(false); setEstabelecimentoId(""); setTelaLogin(true);
          setErroLogin("⏳ Cadastro aguardando aprovação. Aguarde o contato do administrador.");
          return;
        }
        if (status === "bloqueado" && !isMaster) {
          setCarregando(false); setEstabelecimentoId(""); setTelaLogin(true);
          setErroLogin("🚫 Estabelecimento bloqueado. Entre em contato com o administrador.");
          return;
        }
        if (d.senhaAdmin) setSenhaAdminState(d.senhaAdmin);
        if (d.nomeEstab) setNomeEstabState(d.nomeEstab);
        if (d.logoUrl !== undefined) setLogoUrlState(d.logoUrl || "");
        if (d.clientes) setClientesState(d.clientes);
        if (d.ordens) setOrdensState(d.ordens);
        if (d.despesas) setDespesasState(d.despesas);
        if (d.estoque) setEstoqueState(d.estoque);
        if (d.avisos) setAvisosState(d.avisos);
        if (d.tabelaServicos) setTabelaServicosState(d.tabelaServicos);
        setPlanoState(d.plano || "degustacao");
        setDataExpiracaoState(d.dataExpiracao || null);
        setLimiteClientesCustom(d.limiteClientes || 15);
      } else {
        setCarregando(false); setEstabelecimentoId(""); setTelaLogin(true);
        setErroLogin("❌ Estabelecimento não encontrado. Solicite o cadastro primeiro.");
        return;
      }
      setCarregando(false);
    });
    return () => unsub();
  // eslint-disable-next-line
  }, [estabelecimentoId, isMaster]);

  useEffect(() => {
    window.history.pushState(null, "", window.location.href);
    const h = () => window.history.pushState(null, "", window.location.href);
    window.addEventListener("popstate", h);
    return () => window.removeEventListener("popstate", h);
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

  // ── Firebase: salvar ──
  const salvarFB = async (campo, valor) => {
    setSalvando(true);
    try { await setDoc(doc(db, "estetica", estabelecimentoId), { [campo]: valor }, { merge: true }); }
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
  const setAvisos = (val) => { const n = typeof val==="function"?val(avisos):val; setAvisosState(n); salvarFB("avisos", n); };
  const setTabelaServicos = (val) => { const n = typeof val==="function"?val(tabelaServicos):val; setTabelaServicosState(n); salvarFB("tabelaServicos", n); };

  // ── Plano ──
  const isFull = plano === "full" || isMaster;
  const diasRestantes = dataExpiracao ? Math.max(0, Math.ceil((new Date(dataExpiracao) - new Date()) / 86400000)) : null;
  const expirado = dataExpiracao ? new Date() > new Date(dataExpiracao) : false;
  const limiteClientes = isFull ? Infinity : limiteClientesCustom;

  // ── Login ──
  const entrar = () => {
    const id = idInput.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_");
    if (!id) { setErroLogin("Digite o código do estabelecimento."); return; }
    if (tipoAcesso === "admin" && !senhaInput) { setErroLogin("Digite a senha."); return; }
    if (tipoAcesso === "admin" && senhaInput === SENHA_MASTER) {
      setIsMaster(true); setIsAdmin(true); setSenha(senhaInput);
      setTelaLogin(false); setTelaGruposMaster(true); carregarGrupos(); return;
    }
    setIsMaster(false);
    setEstabelecimentoId(id);
    setIsAdmin(tipoAcesso === "admin");
    setSenha(senhaInput);
    setTelaLogin(false);
  };

  useEffect(() => {
    if (estabelecimentoId && !carregando && isAdmin && senhaAdmin && !isMaster) {
      if (senha !== senhaAdmin) {
        setIsAdmin(false); setTelaLogin(true); setEstabelecimentoId("");
        setErroLogin("Senha incorreta. Tente novamente.");
      }
    }
  // eslint-disable-next-line
  }, [carregando, senhaAdmin, isMaster]);

  const carregarGrupos = async () => {
    setCarregandoGrupos(true);
    try {
      const { collection, getDocs } = await import("firebase/firestore");
      const snap = await getDocs(collection(db, "estetica"));
      const lista = [];
      snap.forEach(d => lista.push({ id: d.id, ...d.data() }));
      lista.sort((a, b) => (a.nomeEstab || a.id).localeCompare(b.nomeEstab || b.id));
      setGruposLista(lista);
    } catch(e) { console.error(e); }
    setCarregandoGrupos(false);
  };

  const solicitarCadastro = async () => {
    const { nome, responsavel, telefone, email, codigo } = cadastroForm;
    if (!nome || !responsavel || !telefone || !email || !codigo) { setErroCadastro("Preencha todos os campos."); return; }
    if (!email.includes("@")) { setErroCadastro("Email inválido."); return; }
    const id = codigo.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_");
    if (!id) { setErroCadastro("Código inválido. Use letras, números e underline."); return; }
    try {
      const snap = await new Promise(resolve => {
        const unsub = onSnapshot(doc(db, "estetica", id), s => { unsub(); resolve(s); });
      });
      if (snap.exists()) { setErroCadastro("Código já em uso. Escolha outro."); return; }
      await setDoc(doc(db, "estetica", id), {
        nomeEstab: nome.toUpperCase(), responsavel, telefone: maskTelefone(telefone),
        emailResponsavel: email, senhaAdmin: "admin123", status: "pendente",
        dataCadastro: new Date().toISOString(),
        clientes: [], ordens: [], despesas: [], estoque: [], avisos: [],
        tabelaServicos: [
          { id:1, nome:"Lavagem Completa", preco:"80,00" },
          { id:2, nome:"Polimento", preco:"250,00" },
          { id:3, nome:"Cristalização Cerâmica", preco:"600,00" },
          { id:4, nome:"Higienização Interna", preco:"150,00" },
        ]
      });
      setOkCadastro("✅ Cadastro enviado! Aguarde a aprovação do administrador.");
      setErroCadastro("");
      setCadastroForm({ nome:"", responsavel:"", telefone:"", email:"", codigo:"" });
    } catch(e) { setErroCadastro("Erro ao enviar. Tente novamente."); }
  };

  // ── Cálculos financeiros ──
  const ordensDoMes = ordens.filter(o => o.data && o.data.startsWith(mesFiltro) && o.status !== "Cancelado");
  const receitaMes = ordensDoMes.reduce((acc, o) => acc + parseDinheiro(o.valorTotal) - parseDinheiro(o.desconto||"0"), 0);
  const despesasMes = despesas.filter(d => d.data && d.data.startsWith(mesFiltro)).reduce((acc, d) => acc + parseDinheiro(d.valor), 0);
  const saldoMes = receitaMes - despesasMes;
  const osPendentes = ordens.filter(o => o.status === "Aguardando" || o.status === "Em Andamento").length;
  const clientesAtivos = clientes.length;
  const estoqueBaixo = estoque.filter(e => parseFloat(e.quantidade) <= parseFloat(e.quantidadeMin||0));

  // ── Salvar cliente ──
  const salvarCliente = () => {
    if (!clienteForm.nome) return;
    if (!clienteEditId && !isFull && clientes.length >= limiteClientes) { setShowUpgrade(true); return; }
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

  const removerVeiculoCliente = (vid) => {
    setClienteForm(f => ({ ...f, veiculos: f.veiculos.filter(v => v.id !== vid) }));
  };

  // ── Salvar OS ──
  const salvarOS = () => {
    if (!osForm.clienteId) return;
    const total = osForm.servicos.reduce((a, s) => a + parseDinheiro(s.valor), 0);
    const osFinal = { ...osForm, valorTotal: maskDinheiro(String(Math.round(total*100))), id: osEditId || Date.now() };
    if (osEditId) {
      setOrdens(ordens.map(o => o.id === osEditId ? osFinal : o));
    } else {
      setOrdens([...ordens, osFinal]);
    }
    setModalOS(false); setOsForm(osVazia); setOsEditId(null);
  };

  const adicionarServicoOS = () => {
    if (!servicoOS.nome || !servicoOS.valor) return;
    setOsForm(f => ({ ...f, servicos: [...f.servicos, { ...servicoOS, id: Date.now() }] }));
    setServicoOS({ nome:"", valor:"", categoria:"Lavagem Completa" });
  };

  const selecionarServicoTabela = (s) => {
    setServicoOS({ nome: s.nome, valor: s.preco, categoria: s.nome });
  };

  // ── Salvar despesa ──
  const salvarDespesa = () => {
    if (!despesaForm.descricao || !despesaForm.valor) return;
    setDespesas([...despesas, { ...despesaForm, id: Date.now() }]);
    setModalDespesa(false); setDespesaForm(despesaVazia);
  };

  // ── Salvar estoque ──
  const salvarEstoque = () => {
    if (!estoqueForm.nome) return;
    if (estoqueEditId) {
      setEstoque(estoque.map(e => e.id === estoqueEditId ? { ...e, ...estoqueForm } : e));
    } else {
      setEstoque([...estoque, { ...estoqueForm, id: Date.now() }]);
    }
    setModalEstoque(false); setEstoqueForm(estoqueVazio); setEstoqueEditId(null);
  };

  // ── Trocar senha ──
  const trocarSenha = () => {
    if (senhaAtual !== senhaAdmin) { setErroSenha("Senha atual incorreta."); setOkSenha(""); return; }
    if (senhaNova.length < 4) { setErroSenha("Mínimo 4 caracteres."); setOkSenha(""); return; }
    if (senhaNova !== senhaConfirm) { setErroSenha("Senhas não coincidem."); setOkSenha(""); return; }
    setSenhaAdmin(senhaNova); setErroSenha(""); setOkSenha("✅ Senha alterada!");
    setSenhaAtual(""); setSenhaNova(""); setSenhaConfirm("");
  };

  // ── Master: plano ──
  const definirPlano = async (id, tipo, dias, limite) => {
    const expiracao = (tipo === "degustacao" && dias) ? new Date(Date.now() + dias*86400000).toISOString() : null;
    const { doc: docFn, setDoc: setDocFn } = await import("firebase/firestore");
    await setDocFn(docFn(db, "estetica", id), { plano: tipo, dataExpiracao: expiracao, limiteClientes: limite }, { merge: true });
    setEditandoPlano(null); carregarGrupos();
  };
  const aprovar = async (id, g) => {
    const { doc: docFn, setDoc: setDocFn } = await import("firebase/firestore");
    await setDocFn(docFn(db, "estetica", id), { status: "ativo" }, { merge: true });
    carregarGrupos();
  };
  const bloquear = async (id) => {
    const { doc: docFn, setDoc: setDocFn } = await import("firebase/firestore");
    await setDocFn(docFn(db, "estetica", id), { status: "bloqueado" }, { merge: true });
    carregarGrupos();
  };
  const excluirGrupo = async (id) => {
    if (!confirm(`Excluir ${id}? Ação irreversível!`)) return;
    const { doc: docFn, deleteDoc } = await import("firebase/firestore");
    await deleteDoc(docFn(db, "estetica", id));
    carregarGrupos();
  };

  // ════════════════════════ RENDER ══════════════════════════════════════════

  // ── Google Fonts ──
  useEffect(() => {
    const link = document.createElement("link");
    link.href = "https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600;700&family=Barlow+Condensed:wght@700;800;900&display=swap";
    link.rel = "stylesheet";
    document.head.appendChild(link);
  }, []);

  if (telaLanding) return <TelaLanding onLogin={() => { setTelaLanding(false); setTelaLogin(true); }} onCadastro={() => { setTelaLanding(false); setTelaCadastro(true); }} />;

  if (telaCadastro) return (
    <div style={{ ...S.page, display:"flex", alignItems:"center", justifyContent:"center", padding:16, minHeight:"100vh" }}>
      <div style={{ ...S.card, width:"100%", maxWidth:480 }}>
        <button onClick={() => { setTelaCadastro(false); setTelaLanding(true); }} style={{ ...S.btnGhost, marginBottom:20, fontSize:13, padding:"6px 14px" }}>← Voltar</button>
        <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:24 }}>
          <div style={{ width:44, height:44, borderRadius:12, background:"linear-gradient(135deg, #00d97e, #00b865)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:22 }}>🚗</div>
          <div>
            <div style={S.h2}>SOLICITAR ACESSO</div>
            <div style={{ color:"#64748b", fontSize:13 }}>EcoEstética — Gestão Profissional</div>
          </div>
        </div>
        {[["NOME DO ESTABELECIMENTO","nome","text"],["RESPONSÁVEL","responsavel","text"],["TELEFONE","telefone","tel"],["E-MAIL","email","email"],["CÓDIGO DO SISTEMA (login)","codigo","text"]].map(([lbl, campo, tipo]) => (
          <div key={campo} style={{ marginBottom:14 }}>
            <label style={S.label}>{lbl}</label>
            <input style={S.input} type={tipo} value={cadastroForm[campo]}
              onChange={e => setCadastroForm(f => ({ ...f, [campo]: campo==="telefone" ? maskTelefone(e.target.value) : e.target.value }))} />
          </div>
        ))}
        {erroCadastro && <div style={{ background:"rgba(255,71,87,0.1)", border:"1px solid #ff4757", borderRadius:10, padding:12, color:"#ff4757", fontSize:13, marginBottom:12 }}>{erroCadastro}</div>}
        {okCadastro && <div style={{ background:"rgba(0,217,126,0.1)", border:"1px solid #00d97e", borderRadius:10, padding:12, color:"#00d97e", fontSize:13, marginBottom:12 }}>{okCadastro}</div>}
        <button style={{ ...S.btn("#00d97e"), width:"100%", padding:14, fontSize:15 }} onClick={solicitarCadastro}>SOLICITAR CADASTRO</button>
        <p style={{ color:"#64748b", fontSize:12, textAlign:"center", marginTop:12 }}>Após aprovação você receberá as credenciais de acesso.</p>
      </div>
    </div>
  );

  if (telaLogin) return (
    <div style={{ ...S.page, display:"flex", alignItems:"center", justifyContent:"center", padding:16, minHeight:"100vh" }}>
      <div style={{ ...S.card, width:"100%", maxWidth:420 }}>
        <button onClick={() => { setTelaLogin(false); setTelaLanding(true); setErroLogin(""); }} style={{ ...S.btnGhost, marginBottom:20, fontSize:13, padding:"6px 14px" }}>← Voltar</button>
        <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:28 }}>
          <div style={{ width:48, height:48, borderRadius:14, background:"linear-gradient(135deg, #00d97e, #00b865)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:26 }}>🚗</div>
          <div>
            <div style={S.h1}>ECOESTÉTICA</div>
            <div style={{ color:"#64748b", fontSize:13 }}>Gestão Profissional</div>
          </div>
        </div>

        <div style={{ display:"flex", gap:8, marginBottom:20 }}>
          {["visitante","admin"].map(t => (
            <button key={t} onClick={() => setTipoAcesso(t)} style={{ flex:1, cursor:"pointer", borderRadius:10, border:`2px solid ${tipoAcesso===t?"#00d97e":"#1e2e50"}`, background: tipoAcesso===t?"rgba(0,217,126,0.1)":"transparent", color: tipoAcesso===t?"#00d97e":"#64748b", padding:"10px", fontFamily:"'Barlow', sans-serif", fontWeight:700, fontSize:14 }}>
              {t === "visitante" ? "👁 Visitante" : "🔑 Admin"}
            </button>
          ))}
        </div>

        <div style={{ marginBottom:14 }}>
          <label style={S.label}>CÓDIGO DO ESTABELECIMENTO</label>
          <input style={S.input} value={idInput} onChange={e => setIdInput(e.target.value)} onKeyDown={e => e.key==="Enter" && entrar()} placeholder="ex: ecocar_niteroi" />
        </div>
        {tipoAcesso === "admin" && (
          <div style={{ marginBottom:14 }}>
            <label style={S.label}>SENHA</label>
            <div style={{ position:"relative" }}>
              <input style={{ ...S.input, paddingRight:44 }} type={showSenhaLogin?"text":"password"} value={senhaInput} onChange={e => setSenhaInput(e.target.value)} onKeyDown={e => e.key==="Enter" && entrar()} />
              <button onClick={() => setShowSenhaLogin(v => !v)} style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", color:"#64748b", cursor:"pointer", fontSize:18 }}>{showSenhaLogin?"🙈":"👁"}</button>
            </div>
          </div>
        )}
        {erroLogin && <div style={{ background:"rgba(255,71,87,0.1)", border:"1px solid #ff4757", borderRadius:10, padding:12, color:"#ff4757", fontSize:13, marginBottom:12 }}>{erroLogin}</div>}
        <button style={{ ...S.btn("#00d97e"), width:"100%", padding:14, fontSize:15 }} onClick={entrar}>ENTRAR</button>
        <p style={{ textAlign:"center", color:"#64748b", fontSize:13, marginTop:16 }}>
          Não tem cadastro?{" "}
          <span onClick={() => { setTelaLogin(false); setTelaCadastro(true); setErroLogin(""); }} style={{ color:"#00d97e", cursor:"pointer", fontWeight:700 }}>Solicitar acesso</span>
        </p>
      </div>
    </div>
  );

  if (telaGruposMaster) return <PainelMaster grupos={gruposLista} carregando={carregandoGrupos} onEntrar={(id) => { setEstabelecimentoId(id); setTelaGruposMaster(false); }} editandoPlano={editandoPlano} setEditandoPlano={setEditandoPlano} planoEdit={planoEdit} setPlanoEdit={setPlanoEdit} definirPlano={definirPlano} aprovar={aprovar} bloquear={bloquear} excluir={excluirGrupo} />;

  if (carregando) return <div style={{ ...S.page, display:"flex", alignItems:"center", justifyContent:"center" }}><div style={{ textAlign:"center" }}><div style={{ fontSize:48, marginBottom:16 }}>🚗</div><div style={{ color:"#64748b" }}>Carregando...</div></div></div>;

  if (expirado && !isFull) return (
    <div style={{ ...S.page, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
      <div style={{ ...S.card, maxWidth:420, textAlign:"center" }}>
        <div style={{ fontSize:64, marginBottom:16 }}>⏰</div>
        <div style={S.h1}>PERÍODO EXPIRADO</div>
        <p style={{ color:"#94a3b8", marginTop:12 }}>Seu acesso de degustação expirou. Entre em contato com o administrador para ativar o plano completo.</p>
        <button style={{ ...S.btn("#00d97e"), marginTop:20 }} onClick={() => { setEstabelecimentoId(""); setTelaLogin(true); }}>Voltar ao Login</button>
      </div>
    </div>
  );

  // ── App principal ──
  const abas = [
    { id:"dashboard", icon:"📊", label:"Dashboard" },
    { id:"clientes", icon:"👥", label:"Clientes" },
    { id:"os", icon:"🔧", label:"Ordens" },
    { id:"financeiro", icon:"💰", label:"Financeiro" },
    { id:"estoque", icon:"📦", label:"Estoque" },
    ...(isAdmin ? [{ id:"config", icon:"⚙️", label:"Config" }] : []),
  ];

  const clienteNome = (id) => clientes.find(c => c.id === id)?.nome || "—";

  return (
    <ErrorBoundary>
      <div style={{ ...S.page, paddingBottom:80 }}>
        {/* Header */}
        <div style={{ background:"linear-gradient(135deg, #0a0f1e, #111827)", borderBottom:"1px solid #1e2e50", padding:"12px 16px", display:"flex", alignItems:"center", justifyContent:"space-between", position:"sticky", top:0, zIndex:100 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            {logoUrl ? <img src={logoUrl} alt="logo" style={{ width:36, height:36, borderRadius:8, objectFit:"cover" }} /> : <div style={{ width:36, height:36, borderRadius:8, background:"linear-gradient(135deg,#00d97e,#00b865)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20 }}>🚗</div>}
            <div>
              <div style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:900, fontSize:18, lineHeight:1 }}>{nomeEstab}</div>
              {isMaster && <div style={{ fontSize:10, color:"#00d97e", fontWeight:700 }}>MASTER</div>}
              {!isMaster && !isFull && diasRestantes !== null && <div style={{ fontSize:10, color:"#ffba00", fontWeight:700 }}>DEGUSTAÇÃO · {diasRestantes}d restantes</div>}
            </div>
          </div>
          <div style={{ display:"flex", gap:8, alignItems:"center" }}>
            {salvando && <span style={{ fontSize:11, color:"#64748b" }}>💾</span>}
            {showInstall && <button onClick={instalarApp} style={{ ...S.btn("#3b82f6"), padding:"6px 12px", fontSize:12 }}>📲 Instalar</button>}
            <button onClick={() => { setEstabelecimentoId(""); setTelaLogin(true); setIsAdmin(false); setIsMaster(false); setSenha(""); }} style={{ ...S.btnGhost, padding:"6px 14px", fontSize:12 }}>Sair</button>
          </div>
        </div>

        {/* Avisos */}
        {avisos.filter(a => !a.lido).map(a => (
          <div key={a.id} style={{ background: a.urgente ? "rgba(255,71,87,0.12)" : "rgba(255,186,0,0.08)", borderBottom:`1px solid ${a.urgente?"#ff4757":"#ffba00"}33`, padding:"10px 16px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <span style={{ fontSize:14, color: a.urgente?"#ff4757":"#ffba00" }}>{a.urgente?"🚨":"📢"} {a.texto}</span>
            <button onClick={() => setAvisos(avisos.map(av => av.id===a.id ? { ...av, lido:true } : av))} style={{ background:"none", border:"none", color:"#64748b", cursor:"pointer", fontSize:18 }}>×</button>
          </div>
        ))}

        {/* Estoque baixo */}
        {estoqueBaixo.length > 0 && (
          <div style={{ background:"rgba(255,71,87,0.08)", borderBottom:"1px solid #ff475733", padding:"8px 16px" }}>
            <span style={{ fontSize:13, color:"#ff4757" }}>⚠️ Estoque baixo: {estoqueBaixo.map(e => e.nome).join(", ")}</span>
          </div>
        )}

        {/* Conteúdo */}
        <div style={{ padding:16, maxWidth:900, margin:"0 auto" }}>
          {aba === "dashboard" && <AbaDashboard receitaMes={receitaMes} despesasMes={despesasMes} saldoMes={saldoMes} osPendentes={osPendentes} clientesAtivos={clientesAtivos} ordensDoMes={ordensDoMes} mesFiltro={mesFiltro} setMesFiltro={setMesFiltro} ordens={ordens} clientes={clientes} clienteNome={clienteNome} isAdmin={isAdmin} setModalOS={setModalOS} avisos={avisos} setAvisos={setAvisos} modalAviso={modalAviso} setModalAviso={setModalAviso} avisoTexto={avisoTexto} setAvisoTexto={setAvisoTexto} avisoUrgente={avisoUrgente} setAvisoUrgente={setAvisoUrgente} />}

          {aba === "clientes" && <AbaClientes clientes={clientes} setClientes={setClientes} ordens={ordens} filtro={filtroClientes} setFiltro={setFiltroClientes} isAdmin={isAdmin} modalCliente={modalCliente} setModalCliente={setModalCliente} clienteForm={clienteForm} setClienteForm={setClienteForm} clienteEditId={clienteEditId} setClienteEditId={setClienteEditId} salvarCliente={salvarCliente} veiculoTemp={veiculoTemp} setVeiculoTemp={setVeiculoTemp} showVeiculoForm={showVeiculoForm} setShowVeiculoForm={setShowVeiculoForm} adicionarVeiculoCliente={adicionarVeiculoCliente} removerVeiculoCliente={removerVeiculoCliente} clienteVazio={clienteVazio} maskTelefone={maskTelefone} isFull={isFull} limiteClientes={limiteClientes} setShowUpgrade={setShowUpgrade} />}

          {aba === "os" && <AbaOS ordens={ordens} setOrdens={setOrdens} clientes={clientes} tabelaServicos={tabelaServicos} filtro={filtroOS} setFiltro={setFiltroOS} isAdmin={isAdmin} modalOS={modalOS} setModalOS={setModalOS} osForm={osForm} setOsForm={setOsForm} osEditId={osEditId} setOsEditId={setOsEditId} salvarOS={salvarOS} servicoOS={servicoOS} setServicoOS={setServicoOS} adicionarServicoOS={adicionarServicoOS} selecionarServicoTabela={selecionarServicoTabela} osVazia={osVazia} maskDinheiro={maskDinheiro} clienteNome={clienteNome} modalOSDetalhe={modalOSDetalhe} setModalOSDetalhe={setModalOSDetalhe} mesFiltro={mesFiltro} setMesFiltro={setMesFiltro} />}

          {aba === "financeiro" && <AbaFinanceiro ordens={ordens} despesas={despesas} setDespesas={setDespesas} receitaMes={receitaMes} despesasMes={despesasMes} saldoMes={saldoMes} mesFiltro={mesFiltro} setMesFiltro={setMesFiltro} isAdmin={isAdmin} modalDespesa={modalDespesa} setModalDespesa={setModalDespesa} despesaForm={despesaForm} setDespesaForm={setDespesaForm} salvarDespesa={salvarDespesa} despesaVazia={despesaVazia} clienteNome={clienteNome} fmtDinheiro={fmtDinheiro} parseDinheiro={parseDinheiro} maskDinheiro={maskDinheiro} />}

          {aba === "estoque" && <AbaEstoque estoque={estoque} setEstoque={setEstoque} isAdmin={isAdmin} modalEstoque={modalEstoque} setModalEstoque={setModalEstoque} estoqueForm={estoqueForm} setEstoqueForm={setEstoqueForm} estoqueEditId={estoqueEditId} setEstoqueEditId={setEstoqueEditId} salvarEstoque={salvarEstoque} estoqueVazio={estoqueVazio} maskDinheiro={maskDinheiro} parseDinheiro={parseDinheiro} />}

          {aba === "config" && isAdmin && <AbaConfig nomeEstab={nomeEstab} setNomeEstab={setNomeEstab} logoUrl={logoUrl} setLogoUrl={setLogoUrl} tabelaServicos={tabelaServicos} setTabelaServicos={setTabelaServicos} modalNome={modalNome} setModalNome={setModalNome} modalLogo={modalLogo} setModalLogo={setModalLogo} modalSenha={modalSenha} setModalSenha={setModalSenha} modalTabela={modalTabela} setModalTabela={setModalTabela} nomeEdit={nomeEdit} setNomeEdit={setNomeEdit} logoInput={logoInput} setLogoInput={setLogoInput} senhaAtual={senhaAtual} setSenhaAtual={setSenhaAtual} senhaNova={senhaNova} setSenhaNova={setSenhaNova} senhaConfirm={senhaConfirm} setSenhaConfirm={setSenhaConfirm} erroSenha={erroSenha} okSenha={okSenha} trocarSenha={trocarSenha} tabelaEdit={tabelaEdit} setTabelaEdit={setTabelaEdit} maskDinheiro={maskDinheiro} isFull={isFull} plano={plano} diasRestantes={diasRestantes} setShowUpgrade={setShowUpgrade} isMaster={isMaster} />}
        </div>

        {/* Nav bottom */}
        <div style={{ position:"fixed", bottom:0, left:0, right:0, background:"#0a0f1e", borderTop:"1px solid #1e2e50", display:"flex", zIndex:100 }}>
          {abas.map(a => (
            <button key={a.id} onClick={() => setAba(a.id)} style={{ flex:1, cursor:"pointer", background:"none", border:"none", padding:"10px 4px 12px", display:"flex", flexDirection:"column", alignItems:"center", gap:2, color: aba===a.id?"#00d97e":"#475569" }}>
              <span style={{ fontSize:20 }}>{a.icon}</span>
              <span style={{ fontSize:10, fontWeight:700, fontFamily:"'Barlow', sans-serif" }}>{a.label}</span>
            </button>
          ))}
        </div>

        {/* Modal upgrade */}
        {showUpgrade && (
          <div style={S.modal} onClick={() => setShowUpgrade(false)}>
            <div style={{ ...S.modalBox, textAlign:"center" }} onClick={e => e.stopPropagation()}>
              <div style={{ fontSize:48, marginBottom:12 }}>⭐</div>
              <div style={S.h2}>LIMITE ATINGIDO</div>
              <p style={{ color:"#94a3b8", margin:"12px 0 20px" }}>Você atingiu o limite do plano degustação. Entre em contato com o administrador para ativar o plano completo.</p>
              <button style={{ ...S.btn("#00d97e"), width:"100%" }} onClick={() => setShowUpgrade(false)}>Entendido</button>
            </div>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// TELA LANDING
// ════════════════════════════════════════════════════════════════════════════
function TelaLanding({ onLogin, onCadastro }) {
  return (
    <div style={{ minHeight:"100vh", background:"#060c18", color:"#e8ecf3", fontFamily:"'Barlow', sans-serif", display:"flex", flexDirection:"column" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600;700&family=Barlow+Condensed:wght@700;800;900&display=swap');
        * { box-sizing: border-box; }
        body { margin: 0; }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(30px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.6} }
        .feature-card:hover { transform: translateY(-4px); border-color: #00d97e44 !important; }
        .feature-card { transition: all 0.3s ease; }
      `}</style>

      {/* Hero */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"60px 16px", textAlign:"center", background:"radial-gradient(ellipse at 50% 0%, #00d97e18 0%, transparent 60%)" }}>
        <div style={{ animation:"float 4s ease-in-out infinite", fontSize:80, marginBottom:16 }}>🚗</div>
        <div style={{ animation:"fadeUp 0.8s ease", fontFamily:"'Barlow Condensed', sans-serif", fontWeight:900, fontSize:"clamp(48px, 10vw, 80px)", lineHeight:0.9, marginBottom:8 }}>
          <span style={{ color:"#00d97e" }}>ECO</span>ESTÉTICA
        </div>
        <div style={{ animation:"fadeUp 0.8s ease 0.1s both", color:"#64748b", fontSize:18, fontWeight:500, marginBottom:40 }}>
          Gestão Profissional para sua Estética Automotiva
        </div>

        <div style={{ animation:"fadeUp 0.8s ease 0.2s both", display:"flex", gap:12, flexWrap:"wrap", justifyContent:"center" }}>
          <button onClick={onLogin} style={{ cursor:"pointer", border:"none", borderRadius:14, background:"linear-gradient(135deg, #00d97e, #00b865)", color:"#fff", padding:"16px 36px", fontFamily:"'Barlow Condensed', sans-serif", fontWeight:900, fontSize:20, letterSpacing:1 }}>
            ACESSAR SISTEMA
          </button>
          <button onClick={onCadastro} style={{ cursor:"pointer", borderRadius:14, border:"2px solid #1e2e50", background:"transparent", color:"#94a3b8", padding:"16px 36px", fontFamily:"'Barlow Condensed', sans-serif", fontWeight:900, fontSize:20, letterSpacing:1 }}>
            SOLICITAR ACESSO
          </button>
        </div>
      </div>

      {/* Features */}
      <div style={{ padding:"40px 16px", maxWidth:900, margin:"0 auto", width:"100%" }}>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(180px, 1fr))", gap:16 }}>
          {[
            { icon:"👥", title:"Clientes & Veículos", desc:"Cadastro completo com histórico de serviços" },
            { icon:"🔧", title:"Ordens de Serviço", desc:"Controle total do fluxo de trabalho" },
            { icon:"💰", title:"Financeiro", desc:"Receitas, despesas e saldo em tempo real" },
            { icon:"📦", title:"Estoque", desc:"Controle de produtos e alertas de reposição" },
          ].map(f => (
            <div key={f.title} className="feature-card" style={{ background:"linear-gradient(135deg, #111827, #1a2540)", border:"1px solid #1e2e50", borderRadius:16, padding:20, textAlign:"center" }}>
              <div style={{ fontSize:36, marginBottom:8 }}>{f.icon}</div>
              <div style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:900, fontSize:17, marginBottom:4 }}>{f.title}</div>
              <div style={{ fontSize:13, color:"#64748b" }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ textAlign:"center", padding:"20px 16px", color:"#1e2e50", fontSize:12 }}>
        EcoEstética © {new Date().getFullYear()} — Sistema de Gestão Profissional
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// ABA DASHBOARD
// ════════════════════════════════════════════════════════════════════════════
function AbaDashboard({ receitaMes, despesasMes, saldoMes, osPendentes, clientesAtivos, ordensDoMes, mesFiltro, setMesFiltro, ordens, clientes, clienteNome, isAdmin, setModalOS, avisos, setAvisos, modalAviso, setModalAviso, avisoTexto, setAvisoTexto, avisoUrgente, setAvisoUrgente }) {
  const ultimas = [...ordens].sort((a,b) => b.id - a.id).slice(0,5);

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
        <div>
          <div style={{ ...S.h1, fontSize:28 }}>📊 DASHBOARD</div>
          <div style={{ color:"#64748b", fontSize:13 }}>{nomeMes(mesFiltro)}</div>
        </div>
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          <input type="month" value={mesFiltro} onChange={e => setMesFiltro(e.target.value)} style={{ ...S.input, width:"auto", fontSize:13, padding:"8px 12px" }} />
          {isAdmin && <button onClick={() => setModalOS(true)} style={{ ...S.btn("#00d97e"), padding:"8px 16px", fontSize:13 }}>+ OS</button>}
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(150px, 1fr))", gap:12, marginBottom:20 }}>
        {[
          { label:"RECEITA", value: fmtDinheiro(receitaMes), color:"#00d97e", icon:"💰" },
          { label:"DESPESAS", value: fmtDinheiro(despesasMes), color:"#ff4757", icon:"📉" },
          { label:"SALDO", value: fmtDinheiro(saldoMes), color: saldoMes>=0?"#00d97e":"#ff4757", icon:"📊" },
          { label:"OS ABERTAS", value: String(osPendentes), color:"#ffba00", icon:"🔧" },
          { label:"CLIENTES", value: String(clientesAtivos), color:"#3b82f6", icon:"👥" },
        ].map(k => (
          <div key={k.label} style={{ ...S.cardSm, textAlign:"center" }}>
            <div style={{ fontSize:28, marginBottom:4 }}>{k.icon}</div>
            <div style={{ fontSize:11, color:"#64748b", fontWeight:700, letterSpacing:1 }}>{k.label}</div>
            <div style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:900, fontSize:22, color:k.color, marginTop:2 }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Últimas OS */}
      <div style={{ ...S.card, marginBottom:16 }}>
        <div style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:900, fontSize:18, marginBottom:16 }}>ÚLTIMAS ORDENS</div>
        {ultimas.length === 0 && <p style={{ color:"#64748b", fontSize:14 }}>Nenhuma ordem ainda.</p>}
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {ultimas.map(o => (
            <div key={o.id} style={{ ...S.cardSm, display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:8 }}>
              <div>
                <div style={{ fontWeight:700, fontSize:15 }}>{clienteNome(o.clienteId)}</div>
                <div style={{ fontSize:12, color:"#64748b" }}>{o.veiculoPlaca} · {o.data}</div>
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

      {/* Avisos */}
      {isAdmin && (
        <div style={S.card}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
            <div style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:900, fontSize:18 }}>📢 AVISOS</div>
            <button onClick={() => setModalAviso(true)} style={{ ...S.btn("#3b82f6"), padding:"6px 14px", fontSize:13 }}>+ Aviso</button>
          </div>
          {avisos.length === 0 && <p style={{ color:"#64748b", fontSize:14 }}>Nenhum aviso.</p>}
          {avisos.map(a => (
            <div key={a.id} style={{ ...S.cardSm, display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
              <span style={{ fontSize:13, color: a.urgente?"#ff4757":"#e8ecf3" }}>{a.urgente?"🚨":"📢"} {a.texto}</span>
              <button onClick={() => setAvisos(avisos.filter(av => av.id !== a.id))} style={{ background:"none", border:"none", color:"#64748b", cursor:"pointer", fontSize:18 }}>×</button>
            </div>
          ))}
        </div>
      )}

      {modalAviso && (
        <div style={S.modal} onClick={() => setModalAviso(false)}>
          <div style={S.modalBox} onClick={e => e.stopPropagation()}>
            <div style={{ ...S.h2, marginBottom:20 }}>📢 NOVO AVISO</div>
            <label style={S.label}>MENSAGEM</label>
            <textarea value={avisoTexto} onChange={e => setAvisoTexto(e.target.value)} style={{ ...S.input, minHeight:80, resize:"vertical" }} />
            <div style={{ display:"flex", alignItems:"center", gap:8, margin:"12px 0 20px" }}>
              <input type="checkbox" checked={avisoUrgente} onChange={e => setAvisoUrgente(e.target.checked)} id="urgente" />
              <label htmlFor="urgente" style={{ color:"#ff4757", fontWeight:700, fontSize:14, cursor:"pointer" }}>🚨 Marcar como urgente</label>
            </div>
            <div style={{ display:"flex", gap:8 }}>
              <button style={{ ...S.btn("#00d97e"), flex:1 }} onClick={() => { if (!avisoTexto) return; setAvisos(a => [...a, { id:Date.now(), texto:avisoTexto, urgente:avisoUrgente }]); setAvisoTexto(""); setAvisoUrgente(false); setModalAviso(false); }}>PUBLICAR</button>
              <button style={{ ...S.btnGhost }} onClick={() => setModalAviso(false)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// ABA CLIENTES
// ════════════════════════════════════════════════════════════════════════════
function AbaClientes({ clientes, setClientes, ordens, filtro, setFiltro, isAdmin, modalCliente, setModalCliente, clienteForm, setClienteForm, clienteEditId, setClienteEditId, salvarCliente, veiculoTemp, setVeiculoTemp, showVeiculoForm, setShowVeiculoForm, adicionarVeiculoCliente, removerVeiculoCliente, clienteVazio, maskTelefone, isFull, limiteClientes, setShowUpgrade }) {
  const [clienteDetalhe, setClienteDetalhe] = useState(null);
  const filtrado = clientes.filter(c => !filtro || c.nome?.toLowerCase().includes(filtro.toLowerCase()) || c.telefone?.includes(filtro));

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
        <div style={S.h1}>👥 CLIENTES</div>
        {isAdmin && <button onClick={() => { if (!isFull && clientes.length >= limiteClientes) { setShowUpgrade(true); return; } setClienteForm(clienteVazio); setClienteEditId(null); setModalCliente(true); }} style={{ ...S.btn("#00d97e") }}>+ Cliente</button>}
      </div>

      <input style={{ ...S.input, marginBottom:16 }} placeholder="🔍 Buscar por nome ou telefone..." value={filtro} onChange={e => setFiltro(e.target.value)} />

      {!isFull && <div style={{ ...S.cardSm, marginBottom:16, background:"rgba(255,186,0,0.06)", border:"1px solid #ffba0033" }}><span style={{ fontSize:13, color:"#ffba00" }}>📊 {clientes.length}/{limiteClientes} clientes no plano degustação</span></div>}

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
                  {c.veiculos?.length > 0 && <div style={{ fontSize:13, color:"#94a3b8", marginTop:4 }}>🚗 {c.veiculos.map(v => v.placa).join(", ")}</div>}
                </div>
                <div style={{ textAlign:"right" }}>
                  <span style={S.tag("#3b82f6")}>{osCliente} OS</span>
                  {isAdmin && (
                    <div style={{ display:"flex", gap:6, marginTop:8 }}>
                      <button onClick={e => { e.stopPropagation(); setClienteForm({ nome:c.nome, telefone:c.telefone, email:c.email, cpf:c.cpf, veiculos:c.veiculos||[] }); setClienteEditId(c.id); setModalCliente(true); }} style={{ ...S.btn("#3b82f6"), padding:"5px 10px", fontSize:12 }}>✏️</button>
                      <button onClick={e => { e.stopPropagation(); if (confirm("Remover cliente?")) setClientes(clientes.filter(x => x.id !== c.id)); }} style={{ ...S.btn("#ff4757"), padding:"5px 10px", fontSize:12 }}>🗑</button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal cliente */}
      {modalCliente && (
        <div style={S.modal} onClick={() => setModalCliente(false)}>
          <div style={S.modalBox} onClick={e => e.stopPropagation()}>
            <div style={{ ...S.h2, marginBottom:20 }}>{clienteEditId ? "✏️ EDITAR CLIENTE" : "👤 NOVO CLIENTE"}</div>
            {[["NOME *","nome","text"],["TELEFONE","telefone","tel"],["E-MAIL","email","email"],["CPF","cpf","text"]].map(([lbl,campo,tipo]) => (
              <div key={campo} style={{ marginBottom:12 }}>
                <label style={S.label}>{lbl}</label>
                <input style={S.input} type={tipo} value={clienteForm[campo]||""} onChange={e => setClienteForm(f => ({ ...f, [campo]: campo==="telefone"?maskTelefone(e.target.value):e.target.value }))} />
              </div>
            ))}
            {/* Veículos */}
            <div style={{ marginBottom:16 }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
                <label style={S.label}>VEÍCULOS</label>
                <button onClick={() => setShowVeiculoForm(v => !v)} style={{ ...S.btn("#3b82f6"), padding:"4px 10px", fontSize:12 }}>+ Veículo</button>
              </div>
              {showVeiculoForm && (
                <div style={{ ...S.cardSm, marginBottom:10 }}>
                  <div style={S.grid2}>
                    {[["PLACA","placa"],["MODELO","modelo"],["COR","cor"],["ANO","ano"]].map(([lbl,campo]) => (
                      <div key={campo}>
                        <label style={S.label}>{lbl}</label>
                        <input style={S.input} value={veiculoTemp[campo]} onChange={e => setVeiculoTemp(f => ({ ...f, [campo]: e.target.value }))} />
                      </div>
                    ))}
                  </div>
                  <button style={{ ...S.btn("#00d97e"), width:"100%", marginTop:10 }} onClick={adicionarVeiculoCliente}>Adicionar Veículo</button>
                </div>
              )}
              {clienteForm.veiculos?.map(v => (
                <div key={v.id} style={{ ...S.cardSm, display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
                  <span style={{ fontSize:14 }}>🚗 <strong>{v.placa}</strong> · {v.modelo} {v.cor} {v.ano}</span>
                  <button onClick={() => removerVeiculoCliente(v.id)} style={{ background:"none", border:"none", color:"#ff4757", cursor:"pointer", fontSize:18 }}>×</button>
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

      {/* Detalhe cliente */}
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

// ════════════════════════════════════════════════════════════════════════════
// ABA ORDENS DE SERVIÇO
// ════════════════════════════════════════════════════════════════════════════
function AbaOS({ ordens, setOrdens, clientes, tabelaServicos, filtro, setFiltro, isAdmin, modalOS, setModalOS, osForm, setOsForm, osEditId, setOsEditId, salvarOS, servicoOS, setServicoOS, adicionarServicoOS, selecionarServicoTabela, osVazia, maskDinheiro, clienteNome, modalOSDetalhe, setModalOSDetalhe, mesFiltro, setMesFiltro }) {
  const [abaOSFiltro, setAbaOSFiltro] = useState("todas");
  const clienteSelecionado = clientes.find(c => c.id === osForm.clienteId);

  const ordensFiltradas = ordens.filter(o => {
    const matchFiltro = !filtro || clienteNome(o.clienteId).toLowerCase().includes(filtro.toLowerCase()) || o.veiculoPlaca?.toLowerCase().includes(filtro.toLowerCase());
    const matchStatus = abaOSFiltro === "todas" || o.status === abaOSFiltro;
    return matchFiltro && matchStatus;
  }).sort((a,b) => b.id - a.id);

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
        <div style={S.h1}>🔧 ORDENS DE SERVIÇO</div>
        {isAdmin && <button onClick={() => { setOsForm(osVazia); setOsEditId(null); setModalOS(true); }} style={{ ...S.btn("#00d97e") }}>+ OS</button>}
      </div>

      <input style={{ ...S.input, marginBottom:12 }} placeholder="🔍 Buscar por cliente ou placa..." value={filtro} onChange={e => setFiltro(e.target.value)} />

      {/* Filtros status */}
      <div style={{ display:"flex", gap:6, overflowX:"auto", paddingBottom:4, marginBottom:16 }}>
        {["todas","Aguardando","Em Andamento","Pronto","Entregue","Cancelado"].map(s => (
          <button key={s} onClick={() => setAbaOSFiltro(s)} style={{ cursor:"pointer", border:`2px solid ${abaOSFiltro===s?(STATUS_OS_COLOR[s]||"#00d97e"):"#1e2e50"}`, borderRadius:20, background:"transparent", color: abaOSFiltro===s?(STATUS_OS_COLOR[s]||"#00d97e"):"#64748b", padding:"5px 14px", fontFamily:"'Barlow', sans-serif", fontWeight:700, fontSize:12, whiteSpace:"nowrap" }}>
            {s === "todas" ? "Todas" : s} {s!=="todas"&&`(${ordens.filter(o=>o.status===s).length})`}
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

      {/* Modal OS */}
      {modalOS && (
        <div style={S.modal} onClick={() => setModalOS(false)}>
          <div style={S.modalBox} onClick={e => e.stopPropagation()}>
            <div style={{ ...S.h2, marginBottom:20 }}>{osEditId ? "✏️ EDITAR OS" : "🔧 NOVA OS"}</div>
            <div style={{ marginBottom:12 }}>
              <label style={S.label}>CLIENTE *</label>
              <select style={{ ...S.input }} value={osForm.clienteId} onChange={e => setOsForm(f => ({ ...f, clienteId: parseInt(e.target.value)||e.target.value, veiculoPlaca:"" }))}>
                <option value="">Selecione o cliente...</option>
                {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
            {clienteSelecionado?.veiculos?.length > 0 && (
              <div style={{ marginBottom:12 }}>
                <label style={S.label}>VEÍCULO</label>
                <select style={S.input} value={osForm.veiculoPlaca} onChange={e => setOsForm(f => ({ ...f, veiculoPlaca: e.target.value }))}>
                  <option value="">Selecione...</option>
                  {clienteSelecionado.veiculos.map(v => <option key={v.id} value={v.placa}>{v.placa} — {v.modelo}</option>)}
                </select>
              </div>
            )}
            {(!clienteSelecionado || !clienteSelecionado.veiculos?.length) && (
              <div style={{ marginBottom:12 }}>
                <label style={S.label}>PLACA DO VEÍCULO</label>
                <input style={S.input} value={osForm.veiculoPlaca} onChange={e => setOsForm(f => ({ ...f, veiculoPlaca: e.target.value.toUpperCase() }))} placeholder="ABC-1234" />
              </div>
            )}
            <div style={S.grid2}>
              <div>
                <label style={S.label}>DATA</label>
                <input style={S.input} type="date" value={osForm.data} onChange={e => setOsForm(f => ({ ...f, data: e.target.value }))} />
              </div>
              <div>
                <label style={S.label}>PREVISÃO ENTREGA</label>
                <input style={S.input} type="date" value={osForm.previsao} onChange={e => setOsForm(f => ({ ...f, previsao: e.target.value }))} />
              </div>
            </div>
            {/* Serviços */}
            <div style={{ margin:"16px 0 8px" }}>
              <label style={S.label}>SERVIÇOS</label>
              {/* Tabela rápida */}
              <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:8 }}>
                {tabelaServicos.map(ts => (
                  <button key={ts.id} onClick={() => selecionarServicoTabela(ts)} style={{ cursor:"pointer", borderRadius:8, border:"1px solid #1e2e50", background:"rgba(59,130,246,0.08)", color:"#3b82f6", padding:"4px 10px", fontSize:12, fontFamily:"'Barlow', sans-serif", fontWeight:600 }}>
                    {ts.nome} · R${ts.preco}
                  </button>
                ))}
              </div>
              <div style={{ display:"flex", gap:8, marginBottom:8 }}>
                <div style={{ flex:2 }}>
                  <input style={S.input} placeholder="Nome do serviço" value={servicoOS.nome} onChange={e => setServicoOS(f => ({ ...f, nome: e.target.value }))} />
                </div>
                <div style={{ flex:1 }}>
                  <input style={S.input} placeholder="Valor" value={servicoOS.valor} onChange={e => setServicoOS(f => ({ ...f, valor: maskDinheiro(e.target.value) }))} />
                </div>
                <button onClick={adicionarServicoOS} style={{ ...S.btn("#00d97e"), padding:"10px 14px", flexShrink:0 }}>+</button>
              </div>
              {osForm.servicos.map(s => (
                <div key={s.id} style={{ ...S.cardSm, display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6, padding:"8px 12px" }}>
                  <span style={{ fontSize:14 }}>{s.nome}</span>
                  <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                    <span style={{ color:"#00d97e", fontWeight:700, fontSize:14 }}>R$ {s.valor}</span>
                    <button onClick={() => setOsForm(f => ({ ...f, servicos: f.servicos.filter(x => x.id !== s.id) }))} style={{ background:"none", border:"none", color:"#ff4757", cursor:"pointer", fontSize:18 }}>×</button>
                  </div>
                </div>
              ))}
            </div>
            <div style={S.grid2}>
              <div>
                <label style={S.label}>DESCONTO (R$)</label>
                <input style={S.input} value={osForm.desconto} onChange={e => setOsForm(f => ({ ...f, desconto: maskDinheiro(e.target.value) }))} placeholder="0,00" />
              </div>
              <div>
                <label style={S.label}>FORMA DE PAGAMENTO</label>
                <select style={S.input} value={osForm.formaPagamento} onChange={e => setOsForm(f => ({ ...f, formaPagamento: e.target.value }))}>
                  {["PIX","Dinheiro","Cartão Crédito","Cartão Débito","Boleto"].map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
            </div>
            <div style={{ marginTop:12, marginBottom:16 }}>
              <label style={S.label}>STATUS</label>
              <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                {STATUS_OS.map(s => (
                  <button key={s} onClick={() => setOsForm(f => ({ ...f, status:s }))} style={{ cursor:"pointer", border:`2px solid ${osForm.status===s?(STATUS_OS_COLOR[s]||"#00d97e"):"#1e2e50"}`, borderRadius:20, background:"transparent", color:osForm.status===s?(STATUS_OS_COLOR[s]||"#00d97e"):"#64748b", padding:"5px 12px", fontFamily:"'Barlow', sans-serif", fontWeight:700, fontSize:12 }}>{s}</button>
                ))}
              </div>
            </div>
            <div style={{ marginBottom:16 }}>
              <label style={S.label}>OBSERVAÇÕES</label>
              <textarea style={{ ...S.input, minHeight:60, resize:"vertical" }} value={osForm.observacao} onChange={e => setOsForm(f => ({ ...f, observacao: e.target.value }))} />
            </div>
            {osForm.servicos.length > 0 && (
              <div style={{ ...S.cardSm, marginBottom:16, background:"rgba(0,217,126,0.06)", border:"1px solid #00d97e33" }}>
                <div style={{ display:"flex", justifyContent:"space-between" }}>
                  <span style={{ color:"#64748b" }}>Subtotal</span>
                  <span>{fmtDinheiro(osForm.servicos.reduce((a,s)=>a+parseDinheiro(s.valor),0))}</span>
                </div>
                <div style={{ display:"flex", justifyContent:"space-between" }}>
                  <span style={{ color:"#64748b" }}>Desconto</span>
                  <span style={{ color:"#ff4757" }}>- {fmtDinheiro(parseDinheiro(osForm.desconto||"0"))}</span>
                </div>
                <div style={{ display:"flex", justifyContent:"space-between", fontWeight:700, color:"#00d97e", marginTop:4 }}>
                  <span>TOTAL</span>
                  <span style={{ fontFamily:"'Barlow Condensed', sans-serif", fontSize:20 }}>{fmtDinheiro(osForm.servicos.reduce((a,s)=>a+parseDinheiro(s.valor),0) - parseDinheiro(osForm.desconto||"0"))}</span>
                </div>
              </div>
            )}
            <div style={{ display:"flex", gap:8 }}>
              <button style={{ ...S.btn("#00d97e"), flex:1 }} onClick={salvarOS}>SALVAR OS</button>
              <button style={S.btnGhost} onClick={() => setModalOS(false)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* Detalhe OS */}
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
              <div style={{ fontSize:13, color:"#64748b" }}>📅 {modalOSDetalhe.data} {modalOSDetalhe.previsao && `→ Entrega: ${modalOSDetalhe.previsao}`}</div>
              <div style={{ fontSize:13, color:"#64748b" }}>💳 {modalOSDetalhe.formaPagamento}</div>
            </div>
            <div style={{ marginBottom:12 }}>
              {modalOSDetalhe.servicos?.map(s => (
                <div key={s.id} style={{ display:"flex", justifyContent:"space-between", padding:"6px 0", borderBottom:"1px solid #1e2e50", fontSize:14 }}>
                  <span>{s.nome}</span><span style={{ color:"#00d97e" }}>R$ {s.valor}</span>
                </div>
              ))}
              {parseDinheiro(modalOSDetalhe.desconto) > 0 && (
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
                  <button key={s} onClick={() => { setOrdens(ordens.map(o => o.id===modalOSDetalhe.id ? { ...o, status:s } : o)); setModalOSDetalhe({ ...modalOSDetalhe, status:s }); }} style={{ cursor:"pointer", border:`2px solid ${modalOSDetalhe.status===s?(STATUS_OS_COLOR[s]||"#00d97e"):"#1e2e50"}`, borderRadius:20, background:"transparent", color:modalOSDetalhe.status===s?(STATUS_OS_COLOR[s]||"#00d97e"):"#64748b", padding:"5px 12px", fontFamily:"'Barlow', sans-serif", fontWeight:700, fontSize:12 }}>{s}</button>
                ))}
              </div>
            )}
            <div style={{ display:"flex", gap:8 }}>
              {isAdmin && <button style={{ ...S.btn("#3b82f6"), flex:1 }} onClick={() => { setOsForm({ clienteId:modalOSDetalhe.clienteId, veiculoPlaca:modalOSDetalhe.veiculoPlaca, servicos:modalOSDetalhe.servicos||[], observacao:modalOSDetalhe.observacao||"", data:modalOSDetalhe.data, previsao:modalOSDetalhe.previsao||"", status:modalOSDetalhe.status, valorTotal:modalOSDetalhe.valorTotal, desconto:modalOSDetalhe.desconto||"0,00", formaPagamento:modalOSDetalhe.formaPagamento||"PIX" }); setOsEditId(modalOSDetalhe.id); setModalOSDetalhe(null); setModalOS(true); }}>✏️ Editar</button>}
              {isAdmin && <button style={{ ...S.btn("#ff4757") }} onClick={() => { if(confirm("Excluir OS?")) { setOrdens(ordens.filter(o=>o.id!==modalOSDetalhe.id)); setModalOSDetalhe(null); } }}>🗑</button>}
              <button style={S.btnGhost} onClick={() => setModalOSDetalhe(null)}>Fechar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// ABA FINANCEIRO
// ════════════════════════════════════════════════════════════════════════════
function AbaFinanceiro({ ordens, despesas, setDespesas, receitaMes, despesasMes, saldoMes, mesFiltro, setMesFiltro, isAdmin, modalDespesa, setModalDespesa, despesaForm, setDespesaForm, salvarDespesa, despesaVazia, clienteNome, fmtDinheiro, parseDinheiro, maskDinheiro }) {
  const ordensDoMes = ordens.filter(o => o.data?.startsWith(mesFiltro) && o.status !== "Cancelado");
  const despesasDoMes = despesas.filter(d => d.data?.startsWith(mesFiltro));

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
        <div>
          <div style={S.h1}>💰 FINANCEIRO</div>
          <div style={{ color:"#64748b", fontSize:13 }}>{nomeMes(mesFiltro)}</div>
        </div>
        <div style={{ display:"flex", gap:8 }}>
          <input type="month" value={mesFiltro} onChange={e => setMesFiltro(e.target.value)} style={{ ...S.input, width:"auto", fontSize:13, padding:"8px 12px" }} />
          {isAdmin && <button onClick={() => { setDespesaForm(despesaVazia); setModalDespesa(true); }} style={{ ...S.btn("#ff4757"), padding:"8px 14px", fontSize:13 }}>+ Despesa</button>}
        </div>
      </div>

      {/* Resumo */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12, marginBottom:20 }}>
        {[
          { label:"RECEITA", value: fmtDinheiro(receitaMes), color:"#00d97e" },
          { label:"DESPESAS", value: fmtDinheiro(despesasMes), color:"#ff4757" },
          { label:"SALDO", value: fmtDinheiro(saldoMes), color: saldoMes>=0?"#00d97e":"#ff4757" },
        ].map(k => (
          <div key={k.label} style={{ ...S.cardSm, textAlign:"center" }}>
            <div style={{ fontSize:11, color:"#64748b", fontWeight:700, letterSpacing:1 }}>{k.label}</div>
            <div style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:900, fontSize:20, color:k.color, marginTop:4 }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Receitas */}
      <div style={{ ...S.card, marginBottom:16 }}>
        <div style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:900, fontSize:18, marginBottom:12, color:"#00d97e" }}>💰 RECEITAS DO MÊS ({ordensDoMes.length})</div>
        {ordensDoMes.length === 0 && <p style={{ color:"#64748b", fontSize:14 }}>Nenhuma receita neste mês.</p>}
        {ordensDoMes.map(o => (
          <div key={o.id} style={{ display:"flex", justifyContent:"space-between", padding:"8px 0", borderBottom:"1px solid #1e2e50", fontSize:14 }}>
            <div>
              <div style={{ fontWeight:600 }}>{clienteNome(o.clienteId)}</div>
              <div style={{ fontSize:12, color:"#64748b" }}>{o.servicos?.map(s=>s.nome).join(", ")} · {o.formaPagamento}</div>
            </div>
            <span style={{ color:"#00d97e", fontWeight:700, fontFamily:"'Barlow Condensed', sans-serif", fontSize:17 }}>{fmtDinheiro(parseDinheiro(o.valorTotal)-parseDinheiro(o.desconto||"0"))}</span>
          </div>
        ))}
      </div>

      {/* Despesas */}
      <div style={S.card}>
        <div style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:900, fontSize:18, marginBottom:12, color:"#ff4757" }}>📉 DESPESAS DO MÊS ({despesasDoMes.length})</div>
        {despesasDoMes.length === 0 && <p style={{ color:"#64748b", fontSize:14 }}>Nenhuma despesa neste mês.</p>}
        {despesasDoMes.map(d => (
          <div key={d.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 0", borderBottom:"1px solid #1e2e50", fontSize:14 }}>
            <div>
              <div style={{ fontWeight:600 }}>{d.descricao}</div>
              <div style={{ fontSize:12, color:"#64748b" }}>{d.categoria} · {d.data}</div>
            </div>
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
            <div style={{ marginBottom:12 }}>
              <label style={S.label}>DESCRIÇÃO *</label>
              <input style={S.input} value={despesaForm.descricao} onChange={e => setDespesaForm(f => ({ ...f, descricao: e.target.value }))} />
            </div>
            <div style={S.grid2}>
              <div>
                <label style={S.label}>VALOR (R$) *</label>
                <input style={S.input} value={despesaForm.valor} onChange={e => setDespesaForm(f => ({ ...f, valor: maskDinheiro(e.target.value) }))} placeholder="0,00" />
              </div>
              <div>
                <label style={S.label}>DATA</label>
                <input style={S.input} type="date" value={despesaForm.data} onChange={e => setDespesaForm(f => ({ ...f, data: e.target.value }))} />
              </div>
            </div>
            <div style={{ marginTop:12, marginBottom:20 }}>
              <label style={S.label}>CATEGORIA</label>
              <select style={S.input} value={despesaForm.categoria} onChange={e => setDespesaForm(f => ({ ...f, categoria: e.target.value }))}>
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

// ════════════════════════════════════════════════════════════════════════════
// ABA ESTOQUE
// ════════════════════════════════════════════════════════════════════════════
function AbaEstoque({ estoque, setEstoque, isAdmin, modalEstoque, setModalEstoque, estoqueForm, setEstoqueForm, estoqueEditId, setEstoqueEditId, salvarEstoque, estoqueVazio, maskDinheiro, parseDinheiro }) {
  const baixo = estoque.filter(e => parseFloat(e.quantidade) <= parseFloat(e.quantidadeMin||0));

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
        <div style={S.h1}>📦 ESTOQUE</div>
        {isAdmin && <button onClick={() => { setEstoqueForm(estoqueVazio); setEstoqueEditId(null); setModalEstoque(true); }} style={{ ...S.btn("#3b82f6") }}>+ Produto</button>}
      </div>

      {baixo.length > 0 && (
        <div style={{ ...S.cardSm, marginBottom:16, background:"rgba(255,71,87,0.08)", border:"1px solid #ff475733" }}>
          <div style={{ fontWeight:700, color:"#ff4757", marginBottom:6 }}>⚠️ ESTOQUE BAIXO</div>
          {baixo.map(e => <div key={e.id} style={{ fontSize:13, color:"#ff4757" }}>{e.nome}: {e.quantidade} {e.unidade} (mín: {e.quantidadeMin})</div>)}
        </div>
      )}

      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        {estoque.length === 0 && <p style={{ color:"#64748b" }}>Nenhum produto cadastrado.</p>}
        {estoque.map(e => {
          const qtd = parseFloat(e.quantidade)||0;
          const min = parseFloat(e.quantidadeMin)||0;
          const isLow = qtd <= min;
          return (
            <div key={e.id} style={{ ...S.cardSm, border:`1px solid ${isLow?"#ff475733":"#1e2e50"}` }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                <div>
                  <div style={{ fontWeight:700, fontSize:15 }}>{e.nome}</div>
                  <div style={{ fontSize:13, color:"#64748b" }}>Categoria: {e.categoria}</div>
                  {e.custo && <div style={{ fontSize:13, color:"#64748b" }}>Custo: R$ {e.custo}</div>}
                </div>
                <div style={{ textAlign:"right" }}>
                  <span style={S.tag(isLow?"#ff4757":"#00d97e")}>{e.quantidade} {e.unidade}</span>
                  {min > 0 && <div style={{ fontSize:11, color:"#64748b", marginTop:2 }}>mín: {e.quantidadeMin}</div>}
                  {isAdmin && (
                    <div style={{ display:"flex", gap:6, marginTop:8 }}>
                      <button onClick={() => { setEstoqueForm({ nome:e.nome, unidade:e.unidade, quantidade:e.quantidade, quantidadeMin:e.quantidadeMin, custo:e.custo, categoria:e.categoria }); setEstoqueEditId(e.id); setModalEstoque(true); }} style={{ ...S.btn("#3b82f6"), padding:"5px 10px", fontSize:12 }}>✏️</button>
                      <button onClick={() => { if(confirm("Remover produto?")) setEstoque(estoque.filter(x=>x.id!==e.id)); }} style={{ ...S.btn("#ff4757"), padding:"5px 10px", fontSize:12 }}>🗑</button>
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
            <div style={{ ...S.h2, marginBottom:20 }}>{estoqueEditId ? "✏️ EDITAR PRODUTO" : "📦 NOVO PRODUTO"}</div>
            <div style={{ marginBottom:12 }}>
              <label style={S.label}>NOME *</label>
              <input style={S.input} value={estoqueForm.nome} onChange={e => setEstoqueForm(f => ({ ...f, nome: e.target.value }))} />
            </div>
            <div style={S.grid2}>
              <div>
                <label style={S.label}>UNIDADE</label>
                <select style={S.input} value={estoqueForm.unidade} onChange={e => setEstoqueForm(f => ({ ...f, unidade: e.target.value }))}>
                  {["un","L","ml","kg","g","m","rolo","caixa","par"].map(u => <option key={u}>{u}</option>)}
                </select>
              </div>
              <div>
                <label style={S.label}>CATEGORIA</label>
                <select style={S.input} value={estoqueForm.categoria} onChange={e => setEstoqueForm(f => ({ ...f, categoria: e.target.value }))}>
                  {["Produto","Equipamento","EPI","Descartável","Outros"].map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={S.label}>QUANTIDADE</label>
                <input style={S.input} type="number" value={estoqueForm.quantidade} onChange={e => setEstoqueForm(f => ({ ...f, quantidade: e.target.value }))} />
              </div>
              <div>
                <label style={S.label}>QTD MÍNIMA</label>
                <input style={S.input} type="number" value={estoqueForm.quantidadeMin} onChange={e => setEstoqueForm(f => ({ ...f, quantidadeMin: e.target.value }))} />
              </div>
              <div style={{ gridColumn:"1/-1" }}>
                <label style={S.label}>CUSTO UNITÁRIO (R$)</label>
                <input style={S.input} value={estoqueForm.custo} onChange={e => setEstoqueForm(f => ({ ...f, custo: maskDinheiro(e.target.value) }))} placeholder="0,00" />
              </div>
            </div>
            <div style={{ display:"flex", gap:8, marginTop:20 }}>
              <button style={{ ...S.btn("#3b82f6"), flex:1 }} onClick={salvarEstoque}>SALVAR</button>
              <button style={S.btnGhost} onClick={() => setModalEstoque(false)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// ABA CONFIG
// ════════════════════════════════════════════════════════════════════════════
function AbaConfig({ nomeEstab, setNomeEstab, logoUrl, setLogoUrl, tabelaServicos, setTabelaServicos, modalNome, setModalNome, modalLogo, setModalLogo, modalSenha, setModalSenha, modalTabela, setModalTabela, nomeEdit, setNomeEdit, logoInput, setLogoInput, senhaAtual, setSenhaAtual, senhaNova, setSenhaNova, senhaConfirm, setSenhaConfirm, erroSenha, okSenha, trocarSenha, tabelaEdit, setTabelaEdit, maskDinheiro, isFull, plano, diasRestantes, setShowUpgrade, isMaster }) {
  return (
    <div>
      <div style={{ ...S.h1, marginBottom:20 }}>⚙️ CONFIGURAÇÕES</div>

      {/* Plano */}
      <div style={{ ...S.cardSm, marginBottom:16, border:`1px solid ${isFull?"#00d97e33":"#ffba0033"}` }}>
        <div style={{ fontWeight:700, marginBottom:4 }}>📋 PLANO ATUAL</div>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <span style={S.tag(isFull?"#00d97e":"#ffba00")}>{isFull?"⭐ FULL":"🕐 DEGUSTAÇÃO"}</span>
          {!isFull && diasRestantes !== null && <span style={{ fontSize:13, color:"#ffba00" }}>{diasRestantes} dias restantes</span>}
        </div>
        {!isFull && !isMaster && <button onClick={() => setShowUpgrade(true)} style={{ ...S.btn("#00d97e"), marginTop:12, width:"100%" }}>Ativar Plano Full</button>}
      </div>

      {/* Ações */}
      {[
        { label:"✏️ NOME DO ESTABELECIMENTO", sub: nomeEstab, action: () => { setNomeEdit(nomeEstab); setModalNome(true); } },
        { label:"🖼️ LOGO / AVATAR", sub: logoUrl || "Nenhuma logo definida", action: () => { setLogoInput(logoUrl); setModalLogo(true); } },
        { label:"💲 TABELA DE SERVIÇOS", sub: `${tabelaServicos.length} serviços cadastrados`, action: () => { setTabelaEdit([...tabelaServicos]); setModalTabela(true); } },
        { label:"🔑 ALTERAR SENHA", sub: "Troque a senha de administrador", action: () => setModalSenha(true) },
      ].map(item => (
        <div key={item.label} onClick={item.action} style={{ ...S.cardSm, marginBottom:10, cursor:"pointer", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div>
            <div style={{ fontWeight:700, fontSize:15 }}>{item.label}</div>
            <div style={{ fontSize:13, color:"#64748b", marginTop:2 }}>{item.sub}</div>
          </div>
          <span style={{ color:"#3b82f6", fontSize:20 }}>›</span>
        </div>
      ))}

      {/* Modal nome */}
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

      {/* Modal logo */}
      {modalLogo && (
        <div style={S.modal} onClick={() => setModalLogo(false)}>
          <div style={S.modalBox} onClick={e => e.stopPropagation()}>
            <div style={{ ...S.h2, marginBottom:16 }}>🖼️ LOGO</div>
            <label style={S.label}>URL DA IMAGEM</label>
            <input style={{ ...S.input, marginBottom:8 }} value={logoInput} onChange={e => setLogoInput(e.target.value)} placeholder="https://..." />
            {logoInput && <img src={logoInput} alt="preview" style={{ width:80, height:80, borderRadius:12, objectFit:"cover", marginBottom:12, display:"block" }} onError={e => e.target.style.display="none"} />}
            <div style={{ display:"flex", gap:8 }}>
              <button style={{ ...S.btn("#00d97e"), flex:1 }} onClick={() => { setLogoUrl(logoInput); setModalLogo(false); }}>SALVAR</button>
              <button style={{ ...S.btn("#ff4757") }} onClick={() => { setLogoUrl(""); setLogoInput(""); setModalLogo(false); }}>Remover</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal tabela */}
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

      {/* Modal senha */}
      {modalSenha && (
        <div style={S.modal} onClick={() => setModalSenha(false)}>
          <div style={S.modalBox} onClick={e => e.stopPropagation()}>
            <div style={{ ...S.h2, marginBottom:20 }}>🔑 ALTERAR SENHA</div>
            {[["SENHA ATUAL", senhaAtual, setSenhaAtual], ["NOVA SENHA", senhaNova, setSenhaNova], ["CONFIRMAR SENHA", senhaConfirm, setSenhaConfirm]].map(([lbl, val, set]) => (
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

// ════════════════════════════════════════════════════════════════════════════
// PAINEL MASTER
// ════════════════════════════════════════════════════════════════════════════
function PainelMaster({ grupos, carregando, onEntrar, editandoPlano, setEditandoPlano, planoEdit, setPlanoEdit, definirPlano, aprovar, bloquear, excluir }) {
  const statusTag = (s) => {
    if (s === "pendente") return <span style={S.tag("#ffba00")}>⏳ Pendente</span>;
    if (s === "bloqueado") return <span style={S.tag("#ff4757")}>🚫 Bloqueado</span>;
    return <span style={S.tag("#00d97e")}>✅ Ativo</span>;
  };

  if (carregando) return <div style={{ ...S.page, display:"flex", alignItems:"center", justifyContent:"center" }}><p style={{ color:"#64748b" }}>Carregando...</p></div>;

  const pendentes = grupos.filter(g => g.status === "pendente");
  const ativos = grupos.filter(g => g.status !== "pendente");

  return (
    <div style={{ ...S.page, padding:16, maxWidth:900, margin:"0 auto" }}>
      <div style={{ ...S.h1, marginBottom:4, fontSize:28 }}>🔑 PAINEL MASTER</div>
      <p style={{ color:"#64748b", fontSize:13, marginBottom:24 }}>Total de estabelecimentos: {grupos.length}</p>

      {pendentes.length > 0 && (
        <div style={{ ...S.card, marginBottom:20, background:"rgba(255,186,0,0.04)", border:"1px solid #ffba0033" }}>
          <div style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:900, fontSize:20, marginBottom:16, color:"#ffba00" }}>⏳ AGUARDANDO APROVAÇÃO ({pendentes.length})</div>
          {pendentes.map(g => (
            <div key={g.id} style={{ ...S.cardSm, display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:10, marginBottom:8 }}>
              <div>
                <div style={{ fontWeight:700 }}>{g.nomeEstab || g.id}</div>
                <div style={{ fontSize:12, color:"#94a3b8" }}>Código: <strong>{g.id}</strong></div>
                {g.responsavel && <div style={{ fontSize:12, color:"#94a3b8" }}>{g.responsavel} {g.telefone ? `· ${g.telefone}` : ""}</div>}
                {g.dataCadastro && <div style={{ fontSize:11, color:"#475569" }}>Solicitado: {new Date(g.dataCadastro).toLocaleDateString("pt-BR")}</div>}
              </div>
              <div style={{ display:"flex", gap:8 }}>
                <button onClick={() => aprovar(g.id, g)} style={{ ...S.btn("#00d97e"), padding:"7px 14px", fontSize:13 }}>✅ Aprovar</button>
                <button onClick={() => excluir(g.id)} style={{ ...S.btn("#ff4757"), padding:"7px 14px", fontSize:13 }}>🗑 Recusar</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={S.card}>
        <div style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:900, fontSize:20, marginBottom:16 }}>TODOS OS ESTABELECIMENTOS ({ativos.length})</div>
        {ativos.map(g => (
          <div key={g.id} style={{ ...S.cardSm, marginBottom:10 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:8 }}>
              <div>
                <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:4 }}>
                  <span style={{ fontWeight:700 }}>{g.nomeEstab || g.id}</span>
                  {statusTag(g.status)}
                </div>
                <div style={{ fontSize:12, color:"#94a3b8" }}>Código: <strong>{g.id}</strong> · {g.clientes?.length||0} clientes · Plano: {g.plano||"degustacao"}</div>
                {g.responsavel && <div style={{ fontSize:12, color:"#64748b" }}>{g.responsavel}{g.telefone?` · ${g.telefone}`:""}</div>}
              </div>
              <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                <button onClick={() => onEntrar(g.id)} style={{ ...S.btn("#3b82f6"), padding:"6px 12px", fontSize:12 }}>🚪 Entrar</button>
                <button onClick={() => { setEditandoPlano(g.id); setPlanoEdit({ tipo:g.plano||"degustacao", dias:30, limite:g.limiteClientes||15 }); }} style={{ cursor:"pointer", border:"none", borderRadius:8, background:"rgba(59,130,246,0.12)", color:"#3b82f6", padding:"6px 12px", fontFamily:"'Barlow', sans-serif", fontWeight:700, fontSize:12 }}>⚙️ Plano</button>
                {g.status !== "ativo" && <button onClick={() => aprovar(g.id, g)} style={{ ...S.btn("#00d97e"), padding:"6px 12px", fontSize:12 }}>✅ Ativar</button>}
                {g.status !== "bloqueado" && <button onClick={() => bloquear(g.id)} style={{ ...S.btn("#f59e0b"), padding:"6px 12px", fontSize:12 }}>🚫</button>}
                <button onClick={() => excluir(g.id)} style={{ ...S.btn("#ff4757"), padding:"6px 12px", fontSize:12 }}>🗑</button>
              </div>
            </div>
            {editandoPlano === g.id && (
              <div style={{ marginTop:12, background:"#0a0f1e", border:"1px solid #1e2e50", borderRadius:12, padding:16 }}>
                <div style={{ fontWeight:700, fontSize:13, color:"#94a3b8", marginBottom:10 }}>⚙️ CONFIGURAR PLANO</div>
                <div style={{ display:"flex", gap:8, marginBottom:10 }}>
                  <button onClick={() => setPlanoEdit({...planoEdit, tipo:"degustacao"})} style={{ flex:1, cursor:"pointer", border:`2px solid ${planoEdit.tipo==="degustacao"?"#ffba00":"#1e2e50"}`, borderRadius:8, background:planoEdit.tipo==="degustacao"?"rgba(255,186,0,0.1)":"transparent", color:planoEdit.tipo==="degustacao"?"#ffba00":"#64748b", padding:"8px", fontFamily:"'Barlow', sans-serif", fontWeight:700, fontSize:13 }}>🕐 Degustação</button>
                  <button onClick={() => setPlanoEdit({...planoEdit, tipo:"full"})} style={{ flex:1, cursor:"pointer", border:`2px solid ${planoEdit.tipo==="full"?"#00d97e":"#1e2e50"}`, borderRadius:8, background:planoEdit.tipo==="full"?"rgba(0,217,126,0.1)":"transparent", color:planoEdit.tipo==="full"?"#00d97e":"#64748b", padding:"8px", fontFamily:"'Barlow', sans-serif", fontWeight:700, fontSize:13 }}>⭐ Full</button>
                </div>
                {planoEdit.tipo === "degustacao" && (
                  <div style={S.grid2}>
                    <div>
                      <label style={S.label}>DIAS</label>
                      <input type="number" style={S.input} value={planoEdit.dias} onChange={e => setPlanoEdit({...planoEdit, dias:parseInt(e.target.value)||30})} />
                    </div>
                    <div>
                      <label style={S.label}>LIMITE CLIENTES</label>
                      <input type="number" style={S.input} value={planoEdit.limite} onChange={e => setPlanoEdit({...planoEdit, limite:parseInt(e.target.value)||15})} />
                    </div>
                  </div>
                )}
                <div style={{ display:"flex", gap:8, marginTop:12 }}>
                  <button onClick={() => definirPlano(g.id, planoEdit.tipo, planoEdit.tipo==="full"?null:planoEdit.dias, planoEdit.limite)} style={{ ...S.btn("#3b82f6"), flex:1 }}>✅ Salvar</button>
                  <button onClick={() => setEditandoPlano(null)} style={{ ...S.btnGhost }}>✕</button>
                </div>
              </div>
            )}
          </div>
        ))}
        {ativos.length === 0 && <p style={{ color:"#64748b", fontSize:14 }}>Nenhum estabelecimento ativo.</p>}
      </div>
    </div>
  );
}


