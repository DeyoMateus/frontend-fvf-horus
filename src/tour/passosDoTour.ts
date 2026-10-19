// Rodada 264 , tour guiado do primeiro acesso ao painel.
//
// Cada passo aponta para um elemento da tela por uma "expressão de alvo"
// (ver localizarAlvo.ts). Se o elemento não existir naquele momento (por
// exemplo, uma lista vazia), o balão aparece centralizado, sem seta, e o
// tour continua normalmente.
//
// Regra de escrita dos textos , sem dois pontos e sem travessão.

export interface ModuloDoTour {
  id: string;
  titulo: string;
  descricao: string;
  somenteAdmin?: boolean;
}

/** Um módulo para cada item do menu lateral (o primeiro apresenta o próprio menu). */
export const MODULOS_DO_TOUR: ModuloDoTour[] = [
  { id: "menu", titulo: "Menu lateral", descricao: "Apresentação do menu, do sino de notificações e do seu usuário." },
  { id: "painel", titulo: "Painel", descricao: "Os cartões com a situação da operação agora." },
  { id: "painelIndicadores", titulo: "Painel, alertas e indicadores", descricao: "Lista de alertas da frota e indicadores de horas." },
  { id: "fechamento", titulo: "Fechamento", descricao: "Relatório de ponto em PDF e pedidos de ajuste dos motoristas." },
  { id: "motoristas", titulo: "Motoristas", descricao: "Cadastro e lista de motoristas." },
  { id: "ficha", titulo: "Ficha do motorista", descricao: "Tudo sobre um motorista, da jornada ao holerite." },
  { id: "folgas", titulo: "Pedidos de folga", descricao: "Aprovar ou negar as folgas pedidas pelos motoristas." },
  { id: "ajudantes", titulo: "Ajudantes", descricao: "Cadastro dos ajudantes e vínculo com o aparelho." },
  { id: "documentos", titulo: "Documentos de carga", descricao: "Envio e acompanhamento de CT-e e MDF-e." },
  { id: "regras", titulo: "Regras sindicais", descricao: "Convenção coletiva, horas extras, adicional noturno e banco de horas." },
  { id: "empresas", titulo: "Empresas", descricao: "Os CNPJs que fazem parte do seu grupo." },
  { id: "auditoria", titulo: "Auditoria", descricao: "Histórico de tudo o que foi feito no sistema." },
  { id: "lgpd", titulo: "Privacidade (LGPD)", descricao: "Pedidos dos titulares, encarregado e termos aceitos." },
  { id: "usuarios", titulo: "Usuários", descricao: "Quem tem acesso ao painel do grupo.", somenteAdmin: true },
  { id: "configuracao", titulo: "Configuração", descricao: "Seus dados, política de privacidade, gerenciamento de risco e limites de espera." },
];

export interface PassoDoTour {
  /** Módulo (item do menu lateral) a que o passo pertence. */
  modulo: string;
  /** Rota onde o passo acontece. Sem rota, fica na página atual. */
  rota?: string;
  /** Passo da ficha de um motorista (abre o primeiro motorista da lista). */
  detalheMotorista?: boolean;
  /** Expressão do elemento destacado. Sem alvo, o balão fica no centro. */
  alvo?: string;
  titulo: string;
  texto: string;
  somenteAdmin?: boolean;
}

const nav = (rota: string) => `css:nav a[href="${rota}"]`;

export const PASSOS_DO_TOUR: PassoDoTour[] = [
  // ===== Boas-vindas e menu lateral =====
  {
    modulo: "menu",
    rota: "/dashboard",
    titulo: "Seja bem-vindo ao FVF Hórus",
    texto:
      "Vamos fazer um passeio rápido por todas as telas do painel, uma de cada vez. Em cada passo você vai ver um balão com uma seta apontando para o que está sendo explicado. Use o botão Próximo para avançar e o botão Voltar se quiser rever alguma coisa. Se precisar parar, é só clicar no X no canto do balão. Em Módulos você escolhe uma parte específica do sistema para ver. Você poderá refazer este passeio quando quiser.",
  },
  {
    modulo: "menu",
    alvo: "css:.sidebar-toggle",
    titulo: "Menu lateral",
    texto:
      "Este é o menu do sistema. Com este botão você minimiza o menu para ganhar espaço na tela e expande de novo quando quiser. Em telas pequenas ele se minimiza sozinho e passa a mostrar apenas as iniciais de cada tela.",
  },
  {
    modulo: "menu",
    alvo: nav("/dashboard"),
    titulo: "Painel",
    texto:
      "O Painel é a sua central de comando. Aqui você enxerga como está a operação neste momento, quem está dirigindo, quem está descansando, quais alertas pedem atenção e os indicadores de jornada da frota.",
  },
  {
    modulo: "menu",
    alvo: nav("/indicadores"),
    titulo: "Fechamento",
    texto:
      "No Fechamento você gera o relatório de ponto em PDF, pronto para fechar a folha, e também resolve os pedidos de ajuste de ponto que os motoristas enviam pelo aplicativo.",
  },
  {
    modulo: "menu",
    alvo: nav("/motoristas"),
    titulo: "Motoristas",
    texto:
      "Aqui ficam o cadastro de todos os motoristas, o vínculo de cada um com o aparelho e com o veículo, e a ficha completa com a jornada, os alertas e os documentos de cada pessoa.",
  },
  {
    modulo: "menu",
    alvo: nav("/pedidos-folga"),
    titulo: "Pedidos de folga",
    texto:
      "Quando um motorista pede uma folga pelo aplicativo, o pedido chega aqui. Você aprova ou nega e escreve uma justificativa, que o motorista recebe de volta.",
  },
  {
    modulo: "menu",
    alvo: nav("/ajudantes"),
    titulo: "Ajudantes",
    texto:
      "Cadastro dos ajudantes que acompanham os motoristas nas viagens, com o vínculo ao aparelho de cada um.",
  },
  {
    modulo: "menu",
    alvo: nav("/documentos-carga"),
    titulo: "Documentos de carga",
    texto:
      "Envio e consulta dos arquivos XML de CT-e e MDF-e. Cada documento pode ser ligado a um motorista, e o sistema acompanha o status da carga e a entrega.",
  },
  {
    modulo: "menu",
    alvo: nav("/regras-sindicais"),
    titulo: "Regras sindicais",
    texto:
      "Aqui você cadastra as regras da convenção ou do acordo coletivo, como jornada normal, horas extras, adicional noturno e banco de horas. Também ficam aqui os feriados usados nos cálculos.",
  },
  {
    modulo: "menu",
    alvo: nav("/empresas"),
    titulo: "Empresas",
    texto:
      "Lista dos CNPJs do seu grupo. Um mesmo login pode cuidar de várias empresas ao mesmo tempo.",
  },
  {
    modulo: "menu",
    alvo: nav("/auditoria"),
    titulo: "Auditoria",
    texto:
      "Todo ato importante feito no sistema fica registrado aqui, com quem fez, quando fez e o que mudou. É a sua garantia de transparência.",
  },
  {
    modulo: "menu",
    alvo: nav("/lgpd"),
    titulo: "Privacidade (LGPD)",
    texto:
      "Central de privacidade. Aqui você atende os pedidos dos titulares dos dados, cadastra o encarregado pelo tratamento de dados e acompanha quem já aceitou a política e os termos.",
  },
  {
    modulo: "menu",
    alvo: nav("/usuarios"),
    somenteAdmin: true,
    titulo: "Usuários",
    texto:
      "Esta tela aparece só para administradores. Mostra todos os gestores e administradores com acesso ao painel do seu grupo e permite ativar ou desativar cada um.",
  },
  {
    modulo: "menu",
    alvo: "css:.notif-bell",
    titulo: "Sino de notificações",
    texto:
      "O sino avisa quando algo precisa da sua atenção, como um alerta de jornada, um pedido de ajuste de ponto, um pedido de folga ou uma solicitação de privacidade. Clique nele para ver a lista e ir direto ao assunto.",
  },
  {
    modulo: "menu",
    alvo: "css:.sidebar-usuario-info",
    titulo: "Seu usuário",
    texto:
      "Aqui aparece o e-mail com que você entrou e o seu papel no sistema. O administrador pode tudo e o gestor acompanha a operação do dia a dia.",
  },
  {
    modulo: "menu",
    alvo: 'css:[data-tour="refazer-tour"]',
    titulo: "Tour guiado",
    texto:
      "Este botão fica sempre no fim do menu. Clique nele quando quiser rever o passeio ou escolher um módulo que ainda não viu.",
  },
  {
    modulo: "menu",
    alvo: "css:.botao-perfil",
    titulo: "Configuração",
    texto:
      "Nesta tela você edita seus dados, o contato do gerenciamento de risco e os limites de espera dos motoristas. Vamos conhecê-la mais adiante.",
  },
  {
    modulo: "menu",
    alvo: 'css:[data-tour="sair"]',
    titulo: "Sair",
    texto:
      "Quando terminar o trabalho, saia por aqui para proteger a sua conta, principalmente em computadores compartilhados.",
  },

  // ===== Painel =====
  {
    modulo: "painel",
    rota: "/dashboard",
    alvo: "titulo:Painel da operação",
    titulo: "Painel da operação",
    texto:
      "Esta é a fotografia da sua operação agora. Os números abaixo mostram a situação dos motoristas e dos alertas, e cada cartão pode ser clicado para abrir a lista de quem está naquela situação.",
  },
  {
    modulo: "painel",
    alvo: "botao:Atualizar agora",
    titulo: "Atualizar agora",
    texto:
      "O painel se atualiza sozinho, mas se quiser ver o dado mais recente na hora, clique aqui. O horário da última atualização aparece ao lado.",
  },
  {
    modulo: "painel",
    alvo: "texto:Motoristas ativos",
    titulo: "Motoristas ativos",
    texto:
      "Total de motoristas cadastrados e liberados para trabalhar. Motoristas inativos não entram nessa conta.",
  },
  {
    modulo: "painel",
    alvo: "texto:Em direção",
    titulo: "Em direção",
    texto:
      "Quantos motoristas estão dirigindo neste momento. Clique no cartão para ver o nome de cada um.",
  },
  {
    modulo: "painel",
    alvo: "texto:Em descanso",
    titulo: "Em descanso",
    texto:
      "Motoristas que registraram uma parada de descanso e ainda não voltaram a dirigir.",
  },
  {
    modulo: "painel",
    alvo: "texto:Em espera",
    titulo: "Em espera de carga ou descarga",
    texto:
      "Motoristas parados aguardando carregar ou descarregar. Esse tempo é importante porque pode gerar o pagamento de hora de espera.",
  },
  {
    modulo: "painel",
    alvo: "texto:Tempo indefinido",
    titulo: "Tempo indefinido",
    texto:
      "Motoristas que começaram a jornada mas ainda não escolheram em qual etapa estão. Vale cobrar o registro correto para que as horas fiquem certas.",
  },
  {
    modulo: "painel",
    alvo: "texto:Sem jornada aberta",
    titulo: "Sem jornada aberta",
    texto:
      "Motoristas que não estão trabalhando agora porque não iniciaram nenhuma jornada.",
  },
  {
    modulo: "painel",
    alvo: "texto:Nunca bateu ponto",
    titulo: "Nunca bateu ponto",
    texto:
      "Motoristas cadastrados que ainda não fizeram nenhum registro. Normalmente falta instalar o aplicativo ou vincular o aparelho.",
  },
  {
    modulo: "painel",
    alvo: "texto:Alertas críticos em aberto",
    titulo: "Alertas críticos em aberto",
    texto:
      "São as situações mais sérias da Lei do Motorista, como excesso de direção sem descanso. Estes alertas pedem uma ação sua o quanto antes.",
  },
  {
    modulo: "painel",
    alvo: "texto:Alertas de atenção em aberto",
    titulo: "Alertas de atenção em aberto",
    texto:
      "Avisos de que algo está se aproximando do limite. Ainda dá tempo de agir antes de virar um problema.",
  },
  {
    modulo: "painel",
    alvo: "texto:Alertas nas últimas 24h",
    titulo: "Alertas das últimas 24 horas",
    texto:
      "Quantidade de alertas gerados no último dia, para você ter noção do ritmo da operação.",
  },
  {
    modulo: "painel",
    alvo: "texto:Risco de fraude",
    titulo: "Risco de fraude",
    texto:
      "Mostra registros que parecem suspeitos, como um horário ou uma localização que não combinam. Serve para você olhar com mais cuidado, não é uma acusação.",
  },
  {
    modulo: "painel",
    alvo: "texto:Alertas mais frequentes",
    titulo: "Alertas mais frequentes",
    texto:
      "Ranking dos tipos de alerta que mais aconteceram nos últimos sete dias. Ajuda a descobrir qual problema se repete mais na sua frota.",
  },
  {
    modulo: "painel",
    alvo: "texto:Período personalizado",
    titulo: "Período personalizado",
    texto:
      "Escolha uma data inicial e uma data final para olhar o gráfico de evolução de qualquer intervalo. Depois clique em Aplicar. Para voltar ao normal, use o botão Limpar.",
  },
  {
    modulo: "painel",
    alvo: "botao:7 dias",
    titulo: "Atalhos de período",
    texto:
      "Se preferir, use os atalhos de 7, 30 ou 90 dias para trocar o período do gráfico com um clique.",
  },
  {
    modulo: "painelIndicadores",
    alvo: "titulo:Alertas de jornada da empresa",
    titulo: "Alertas de jornada da empresa",
    texto:
      "Lista de todos os alertas da frota. Você pode filtrar por gravidade e por data, abrir cada alerta para ver os detalhes e tratar a ocorrência, anotando o que foi encontrado.",
  },
  {
    modulo: "painelIndicadores",
    alvo: "titulo:Indicadores de Jornada",
    titulo: "Indicadores de jornada",
    texto:
      "Aqui estão os números de horas da sua frota, como direção, espera, horas extras, hora noturna, banco de horas e alertas no período escolhido.",
  },
  {
    modulo: "painelIndicadores",
    alvo: "selectcom:Todos os motoristas",
    titulo: "Filtro por motorista",
    texto:
      "Veja os indicadores da frota inteira ou escolha um motorista para olhar só os números dele.",
  },
  {
    modulo: "painelIndicadores",
    alvo: "selectcom:Todos os indicadores",
    titulo: "Filtro por indicador",
    texto:
      "Escolha mostrar todos os indicadores juntos ou apenas um tipo, como horas extras ou banco de horas.",
  },
  {
    modulo: "painelIndicadores",
    alvo: "botao:Exportar Excel",
    titulo: "Exportar Excel para o RH",
    texto:
      "Gera uma planilha completa com os dados do período, pronta para o RH conferir ou enviar à contabilidade.",
  },

  // ===== Fechamento =====
  {
    modulo: "fechamento",
    rota: "/indicadores",
    alvo: "titulo:Fechamento",
    titulo: "Fechamento de ponto",
    texto:
      "Nesta tela você fecha a folha de ponto do período e também decide os pedidos de ajuste que chegaram dos motoristas.",
  },
  {
    modulo: "fechamento",
    alvo: "rotulo:Início",
    titulo: "Data inicial",
    texto: "Escolha o primeiro dia do período que você quer fechar.",
  },
  {
    modulo: "fechamento",
    alvo: "rotulo:Fim",
    titulo: "Data final",
    texto:
      "Escolha o último dia do período. Não é possível escolher uma data no futuro.",
  },
  {
    modulo: "fechamento",
    alvo: "botao:Fechamento (PDF)",
    titulo: "Gerar o fechamento em PDF",
    texto:
      "Abre a janela para gerar o PDF. Você pode baixar o holerite de um motorista ou fechar a frota inteira de uma vez, com o resumo de todos e o detalhe de cada dia.",
  },
  {
    modulo: "fechamento",
    alvo: "titulo:Solicitações de ajuste de ponto",
    titulo: "Solicitações de ajuste de ponto",
    texto:
      "Quando um motorista esquece de registrar ou registra errado, ele pede o ajuste pelo aplicativo e o pedido aparece aqui. Leia o motivo e as provas anexadas, depois aprove ou recuse. Tudo fica guardado na auditoria.",
  },
  {
    modulo: "fechamento",
    alvo: "titulo:Histórico de solicitações decididas",
    titulo: "Histórico de solicitações",
    texto:
      "Aqui ficam todos os pedidos que já foram decididos, com quem decidiu e quando, para você consultar sempre que precisar.",
  },

  // ===== Motoristas =====
  {
    modulo: "motoristas",
    rota: "/motoristas",
    alvo: "titulo:Motoristas",
    titulo: "Motoristas",
    texto:
      "Esta tela reúne o cadastro e o acompanhamento de todos os motoristas da empresa.",
  },
  {
    modulo: "motoristas",
    alvo: "titulo:Cadastrar motorista",
    titulo: "Cadastrar motorista",
    texto:
      "Para cadastrar uma pessoa nova, preencha os campos abaixo e clique no botão de cadastrar. Os campos obrigatórios precisam estar completos.",
  },
  {
    modulo: "motoristas",
    alvo: "rotulo:Nome",
    titulo: "Nome",
    texto: "Nome completo do motorista, do jeito que aparece no documento.",
  },
  {
    modulo: "motoristas",
    alvo: "rotulo:CPF",
    titulo: "CPF",
    texto:
      "Somente os 11 números. O CPF é a identificação única da pessoa no sistema e não pode se repetir.",
  },
  {
    modulo: "motoristas",
    alvo: "rotulo:CNH",
    titulo: "CNH",
    texto: "Número da carteira de habilitação do motorista.",
  },
  {
    modulo: "motoristas",
    alvo: "rotulo:Telefone de contato",
    titulo: "Telefone de contato",
    texto:
      "Telefone com o código do país. É por ele que a equipe fala com o motorista quando precisa.",
  },
  {
    modulo: "motoristas",
    alvo: "rotulo:ID do rastreador",
    titulo: "Rastreador",
    texto:
      "Se o veículo tem rastreador, informe aqui o código dele e a tecnologia usada. Este campo é opcional.",
  },
  {
    modulo: "motoristas",
    alvo: "rotulo:Empresa (CNPJ)",
    titulo: "Empresa do motorista",
    texto:
      "Escolha a qual CNPJ do grupo este motorista pertence. As regras sindicais são aplicadas de acordo com esta escolha.",
  },
  {
    modulo: "motoristas",
    alvo: "titulo:Radar",
    titulo: "Radar de dias sem interação",
    texto:
      "Quando aparece, este cartão lista os motoristas que passaram um dia inteiro sem bater ponto e sem avisar folga. Pode ser falta de sinal, esquecimento ou algo mais sério, vale confirmar direto com a pessoa.",
  },
  {
    modulo: "motoristas",
    alvo: "titulo:Solicitações de troca de aparelho",
    titulo: "Pedidos de troca de aparelho",
    texto:
      "Quando um motorista troca de celular, o pedido aparece aqui para você autorizar. Isso evita que outra pessoa use o acesso dele.",
  },
  {
    modulo: "motoristas",
    alvo: "coluna:Dispositivo",
    titulo: "Lista de motoristas",
    texto:
      "A lista mostra o status de cada motorista, a placa do veículo e se o aparelho já está vinculado. As etiquetas vermelhas indicam pendências para você resolver.",
  },
  {
    modulo: "motoristas",
    alvo: "botao:Ver detalhes",
    titulo: "Ver detalhes",
    texto:
      "Clique aqui para abrir a ficha completa do motorista. A ficha tem um módulo só dela neste passeio, para você conhecer com calma.",
  },

  // ===== Ficha do motorista =====
  {
    modulo: "ficha",
    detalheMotorista: true,
    titulo: "Ficha do motorista",
    texto:
      "Esta é a ficha de um motorista. Tudo sobre ele fica reunido aqui, dos dados cadastrais até a jornada de cada dia.",
  },
  {
    modulo: "ficha",
    detalheMotorista: true,
    alvo: "titulo:Editar dados cadastrais",
    titulo: "Dados cadastrais",
    texto:
      "Corrija nome, telefone e outros dados sempre que for preciso. Cada alteração fica registrada na auditoria.",
  },
  {
    modulo: "ficha",
    detalheMotorista: true,
    alvo: "titulo:Dispositivo vinculado",
    titulo: "Dispositivo vinculado",
    texto:
      "Mostra qual celular o motorista usa para registrar o ponto. Se ele ainda não tiver aparelho, use Vincular novo aparelho para gerar o código de ativação.",
  },
  {
    modulo: "ficha",
    detalheMotorista: true,
    alvo: "titulo:Veículo de tração vinculado",
    titulo: "Veículo de tração",
    texto:
      "Informe a placa do cavalo mecânico que o motorista conduz. A placa aparece nos relatórios e nos documentos de carga.",
  },
  {
    modulo: "ficha",
    detalheMotorista: true,
    alvo: "titulo:Integridade da cadeia de jornada",
    titulo: "Integridade da jornada",
    texto:
      "Cada registro é ligado ao anterior por uma assinatura digital. O botão Verificar integridade confere se alguém mexeu em algum registro depois de salvo.",
  },
  {
    modulo: "ficha",
    detalheMotorista: true,
    alvo: "titulo:Registros de jornada",
    titulo: "Registros de jornada",
    texto:
      "Lista de todas as marcações feitas pelo motorista, com data, hora, tipo de evento e localização quando existir.",
  },
  {
    modulo: "ficha",
    detalheMotorista: true,
    alvo: "titulo:Jornadas por dia",
    titulo: "Jornadas por dia",
    texto:
      "Resumo de cada dia trabalhado, com horas de direção, espera e descanso. Abra um dia para ver o detalhe completo.",
  },
  {
    modulo: "ficha",
    detalheMotorista: true,
    alvo: "titulo:Jornadas que compõem o ciclo",
    titulo: "Ciclo de jornadas",
    texto:
      "Mostra as jornadas que formam o ciclo atual do motorista, para você entender como o saldo de horas foi calculado.",
  },
  {
    modulo: "ficha",
    detalheMotorista: true,
    alvo: "titulo:Status de carga",
    titulo: "Status de carga",
    texto:
      "Acompanhe os documentos de carga ligados a este motorista e se a entrega já foi concluída.",
  },
  {
    modulo: "ficha",
    detalheMotorista: true,
    alvo: "titulo:Folgas autorrelatadas",
    titulo: "Folgas autorrelatadas",
    texto:
      "Dias de folga que o próprio motorista informou pelo aplicativo.",
  },
  {
    modulo: "ficha",
    detalheMotorista: true,
    alvo: "titulo:Folgas concedidas pelo RH",
    titulo: "Folgas concedidas pelo RH",
    texto:
      "Aqui você concede uma folga. Escolha o dia, escreva o motivo se quiser e confirme. A folga passa a valer no cálculo das horas.",
  },
  {
    modulo: "ficha",
    detalheMotorista: true,
    alvo: "titulo:Alertas de jornada",
    titulo: "Alertas de jornada",
    texto:
      "Todos os alertas gerados para este motorista com base na Lei do Motorista. Abra um alerta para ver o que aconteceu.",
  },
  {
    modulo: "ficha",
    detalheMotorista: true,
    alvo: "titulo:Tratamento de ponto",
    titulo: "Tratamento de ponto",
    texto:
      "Use quando for preciso lançar ou corrigir um evento de ponto no lugar do motorista. Escolha o evento, o horário e escreva o motivo com pelo menos dez letras. Nada é apagado, o que você lança fica registrado junto com o que existia antes.",
  },
  {
    modulo: "ficha",
    detalheMotorista: true,
    alvo: "titulo:Holerite",
    titulo: "Holerite",
    texto:
      "Escolha a data inicial e a final para ver a prévia da folha de ponto deste motorista e baixar o PDF.",
  },

  // ===== Pedidos de folga =====
  {
    modulo: "folgas",
    rota: "/pedidos-folga",
    alvo: "titulo:Pedidos de folga",
    titulo: "Pedidos de folga",
    texto:
      "Tela para decidir as folgas pedidas pelos motoristas.",
  },
  {
    modulo: "folgas",
    alvo: "titulo:Aguardando decisão",
    titulo: "Aguardando decisão",
    texto:
      "Cada linha traz o motorista, o período pedido e o motivo que ele escreveu. Na última coluna você aprova ou nega e escreve a justificativa.",
  },
  {
    modulo: "folgas",
    alvo: "titulo:Já decididos",
    titulo: "Já decididos",
    texto:
      "Histórico das folgas que já foram respondidas, com o resultado, a justificativa e quem decidiu.",
  },

  // ===== Ajudantes =====
  {
    modulo: "ajudantes",
    rota: "/ajudantes",
    alvo: "titulo:Ajudantes",
    titulo: "Ajudantes",
    texto: "Cadastro dos ajudantes da operação.",
  },
  {
    modulo: "ajudantes",
    alvo: "titulo:Cadastrar ajudante",
    titulo: "Cadastrar ajudante",
    texto:
      "Informe o nome, o CPF com 11 números, um telefone se quiser e a empresa do ajudante. Depois é só cadastrar.",
  },
  {
    modulo: "ajudantes",
    alvo: "coluna:Dispositivo",
    titulo: "Lista de ajudantes",
    texto:
      "Veja o status de cada ajudante e se o aparelho já foi vinculado. Use o botão de vincular para gerar o código de ativação do aplicativo.",
  },

  // ===== Documentos de carga =====
  {
    modulo: "documentos",
    rota: "/documentos-carga",
    alvo: "titulo:Documentos de carga",
    titulo: "Documentos de carga",
    texto:
      "Aqui você envia e acompanha os CT-e e MDF-e da operação.",
  },
  {
    modulo: "documentos",
    alvo: "rotulo:Arquivo XML",
    titulo: "Arquivo XML",
    texto:
      "Escolha o arquivo XML do documento. O sistema lê o arquivo e tenta preencher o número e a chave de acesso sozinho.",
  },
  {
    modulo: "documentos",
    alvo: "rotulo:Tipo",
    titulo: "Tipo do documento",
    texto: "Informe se o arquivo é um CT-e ou um MDF-e.",
  },
  {
    modulo: "documentos",
    alvo: "rotulo:Status da carga",
    titulo: "Status da carga",
    texto:
      "Diga em que ponto a carga está, para que o acompanhamento fique correto.",
  },
  {
    modulo: "documentos",
    alvo: "rotulo:Motorista (opcional)",
    titulo: "Motorista responsável",
    texto:
      "Se já souber quem fará o transporte, escolha o motorista. Assim o documento aparece também na ficha dele.",
  },
  {
    modulo: "documentos",
    alvo: "rotulo:Número",
    titulo: "Número do documento",
    texto:
      "Deixe em branco para o sistema tentar extrair o número do próprio XML. Se não conseguir, ele avisa e você digita.",
  },
  {
    modulo: "documentos",
    alvo: "rotulo:Observação",
    titulo: "Observação",
    texto: "Espaço livre para anotar qualquer informação útil. É opcional.",
  },
  {
    modulo: "documentos",
    alvo: "titulo:Documentos enviados",
    titulo: "Documentos enviados",
    texto:
      "Lista de tudo o que já foi enviado, com tipo, número, chave de acesso, status, motorista, data de envio e de entrega. A coluna de cerca virtual mostra se a entrega aconteceu no local previsto.",
  },

  // ===== Regras sindicais =====
  {
    modulo: "regras",
    rota: "/regras-sindicais",
    alvo: "titulo:Regras sindicais",
    titulo: "Regras sindicais",
    texto:
      "Cadastre as regras da convenção ou do acordo coletivo da sua categoria. Os cálculos de horas extras, adicional noturno e banco de horas seguem exatamente o que for informado aqui.",
  },
  {
    modulo: "regras",
    alvo: "rotulo:Nome da convenção",
    titulo: "Nome da convenção",
    texto:
      "Dê um nome que facilite reconhecer a regra, por exemplo o nome do sindicato e o ano.",
  },
  {
    modulo: "regras",
    alvo: "rotulo:Categoria de transporte",
    titulo: "Categoria de transporte",
    texto: "Escolha a categoria à qual esta convenção se aplica.",
  },
  {
    modulo: "regras",
    alvo: "rotulo:Tolerância de marcação",
    titulo: "Tolerância de marcação",
    texto:
      "Diferença de minutos que o sistema aceita sem considerar como atraso ou excesso.",
  },
  {
    modulo: "regras",
    alvo: "rotulo:Jornada normal antes de virar extra",
    titulo: "Jornada normal",
    texto:
      "Quantidade de horas por dia que são consideradas jornada normal. O que passar disso vira hora extra.",
  },
  {
    modulo: "regras",
    alvo: "rotulo:Limite da 1ª faixa de hora extra",
    titulo: "Primeira faixa de hora extra",
    texto:
      "Até quantas horas extras valem o percentual da primeira faixa. Depois disso vale o percentual das demais horas.",
  },
  {
    modulo: "regras",
    alvo: "rotulo:% hora extra (1ª faixa)",
    titulo: "Percentual da primeira faixa",
    texto:
      "Quanto a hora extra da primeira faixa paga a mais que a hora normal.",
  },
  {
    modulo: "regras",
    alvo: "rotulo:% hora extra (demais horas)",
    titulo: "Percentual das demais horas",
    texto: "Percentual aplicado às horas extras que passarem da primeira faixa.",
  },
  {
    modulo: "regras",
    alvo: "rotulo:% adicional noturno",
    titulo: "Adicional noturno",
    texto:
      "Percentual pago a mais pelas horas trabalhadas durante a noite. Ao lado você informa a duração da hora noturna em minutos reais.",
  },
  {
    modulo: "regras",
    alvo: "rotulo:Alerta do banco de horas",
    titulo: "Alerta do banco de horas",
    texto:
      "Defina a partir de quantas horas acumuladas o sistema deve avisar que o banco está ficando alto. É opcional.",
  },
  {
    modulo: "regras",
    alvo: "rotulo:1º período de descanso",
    titulo: "Descanso e refeição",
    texto:
      "Informe os tempos mínimos de descanso e de intervalo para refeição. Esses valores alimentam os alertas da Lei do Motorista.",
  },
  {
    modulo: "regras",
    alvo: "rotulo:% sobre salário-hora para espera",
    titulo: "Pagamento da espera",
    texto:
      "Percentual do salário-hora pago pelo tempo em que o motorista fica esperando carga ou descarga.",
  },
  {
    modulo: "regras",
    alvo: "coluna:CNPJs vinculados",
    titulo: "Regras cadastradas",
    texto:
      "Resumo de todas as regras criadas. Daqui você edita uma regra e vê a quantos CNPJs ela está ligada.",
  },
  {
    modulo: "regras",
    alvo: "titulo:Vincular CNPJ a uma regra",
    titulo: "Vincular CNPJ a uma regra",
    texto:
      "Depois de criar a regra, ligue cada CNPJ do grupo a ela. É assim que o sistema sabe qual regra usar nos cálculos de cada empresa.",
  },

  // ===== Empresas =====
  {
    modulo: "empresas",
    rota: "/empresas",
    alvo: "titulo:Empresas do grupo",
    titulo: "Empresas do grupo",
    texto:
      "Lista de todos os CNPJs que fazem parte do seu grupo.",
  },
  {
    modulo: "empresas",
    alvo: "titulo:Adicionar CNPJ",
    titulo: "Adicionar CNPJ",
    texto:
      "Informe a razão social e o CNPJ com 14 números para incluir uma nova empresa no grupo.",
  },
  {
    modulo: "empresas",
    alvo: "coluna:CNPJ",
    titulo: "Empresas cadastradas",
    texto:
      "Cada linha mostra a razão social e o CNPJ de uma empresa do grupo.",
  },

  // ===== Auditoria =====
  {
    modulo: "auditoria",
    rota: "/auditoria",
    alvo: "titulo:Trilha de auditoria",
    titulo: "Trilha de auditoria",
    texto:
      "Histórico de tudo o que foi feito no sistema, que ninguém consegue apagar nem alterar.",
  },
  {
    modulo: "auditoria",
    alvo: "botao:Filtrar",
    titulo: "Filtros",
    texto:
      "Use os filtros para achar um ato específico, por pessoa, por tipo de ação ou por data, e clique em Filtrar.",
  },
  {
    modulo: "auditoria",
    alvo: "coluna:Quem",
    titulo: "Quem fez o quê",
    texto:
      "Cada linha mostra quando aconteceu, quem fez, qual era o papel da pessoa, qual foi a ação e sobre qual item. Clique em uma linha para ver os detalhes.",
  },

  // ===== Privacidade =====
  {
    modulo: "lgpd",
    rota: "/lgpd",
    alvo: "titulo:Privacidade (LGPD)",
    titulo: "Privacidade (LGPD)",
    texto:
      "A Lei Geral de Proteção de Dados dá direitos às pessoas sobre os próprios dados. Esta tela ajuda a empresa a cumprir isso com tranquilidade.",
  },
  {
    modulo: "lgpd",
    alvo: "botao:Filtrar",
    titulo: "Pedidos dos titulares",
    texto:
      "Os motoristas podem pedir uma cópia dos dados, uma correção ou a exclusão. Os pedidos aparecem aqui com o prazo para resposta. Filtre por situação e abra cada pedido para responder.",
  },
  {
    modulo: "lgpd",
    alvo: "coluna:Termo de GPS",
    titulo: "Ciência e termos",
    texto:
      "Acompanhe quais motoristas já aceitaram a política de privacidade, o termo de dados pessoais e o termo de uso da localização.",
  },
  {
    modulo: "lgpd",
    alvo: "titulo:Encarregado pelo tratamento de dados",
    titulo: "Encarregado (DPO)",
    texto:
      "Cadastre o nome, o e-mail e o telefone da pessoa responsável pelos dados pessoais. Estes contatos aparecem para os motoristas no aplicativo e na página pública de privacidade.",
  },

  // ===== Usuários =====
  {
    modulo: "usuarios",
    rota: "/usuarios",
    somenteAdmin: true,
    alvo: "titulo:Usuários",
    titulo: "Usuários do painel",
    texto:
      "Veja quem tem acesso ao painel do grupo. Desativar um usuário só bloqueia o login dele, o histórico de tudo o que ele fez continua guardado. Para cadastrar uma pessoa nova, fale com o suporte técnico.",
  },
  {
    modulo: "usuarios",
    somenteAdmin: true,
    alvo: "coluna:Papel",
    titulo: "Papel e status",
    texto:
      "O papel define o que a pessoa pode fazer e o status mostra se ela está ativa ou desativada.",
  },

  // ===== Configuração =====
  {
    modulo: "configuracao",
    rota: "/perfil",
    alvo: "titulo:Dados do usuário",
    titulo: "Seus dados",
    texto:
      "Edite o seu nome, o seu contato de WhatsApp e o e-mail de acesso. O papel e o status só podem ser mudados por quem administra a plataforma.",
  },
  {
    modulo: "configuracao",
    alvo: "titulo:Gerenciamento de Risco",
    titulo: "Gerenciamento de Risco",
    texto:
      "Informe o WhatsApp da equipe de gerenciamento de risco. É para este número que o motorista consegue pedir ajuda pelo aplicativo.",
  },
  {
    modulo: "configuracao",
    alvo: "titulo:Limites de espera do motorista",
    titulo: "Limites de espera",
    texto:
      "Defina depois de quantas horas de espera o sistema deve primeiro apenas informar e depois chamar a atenção do gestor.",
  },
  {
    modulo: "configuracao",
    alvo: 'css:[data-tour="refazer-tour"]',
    titulo: "Refazer este passeio",
    texto:
      "Pronto, terminamos! Sempre que quiser rever este passeio, clique neste botão do menu. Bom trabalho!",
  },
];
