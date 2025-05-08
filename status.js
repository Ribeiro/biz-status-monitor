const axios = require("axios");
const dayjs = require("dayjs");
const fs = require("fs").promises;
const path = require("path");

const url =
  "https://status.biz.com.br/sp/api/public/summary_details/statuspages/sG0Skj4gNmzkT68tnb5N6zhiKmVIMDHMOFhMuVF8C8I=?timezone=America/Sao_Paulo";
const jsonPath = path.join(__dirname, "status.json");

const statusDescricao = {
  1: "🟢 Operacional",
  2: "🟡 Performance degradada",
  3: "🟠 Interrupção parcial",
  4: "🔴 Interrupção total",
};

async function baixarJSON() {
  try {
    const { data } = await axios.get(url);
    await fs.writeFile(jsonPath, JSON.stringify(data, null, 2));
    console.log(`✅ Arquivo salvo em: ${jsonPath}`);
    return true;
  } catch (e) {
    console.error("❌ Erro ao baixar JSON:", e.message);
    return false;
  }
}

async function processarStatus() {
  try {
    console.log("▶️ Iniciando processamento do arquivo JSON...");

    const conteudo = await fs.readFile(jsonPath, "utf-8");
    console.log(
      "📄 Arquivo lido com sucesso. Tamanho:",
      conteudo.length,
      "caracteres"
    );

    let data;
    try {
      data = JSON.parse(conteudo);
      console.log("✅ JSON parseado com sucesso.");
    } catch (parseError) {
      console.error("❌ Erro ao fazer parse do JSON:", parseError.message);
      return;
    }

    if (!data.data || !data.data.status_history_details) {
      console.warn("⚠️ status_history_details não encontrado dentro de data.");
      return;
    }

    const recursos = data.data.status_history_details.resource_list;
    if (!Array.isArray(recursos) || recursos.length === 0) {
      console.warn("⚠️ Nenhum recurso encontrado em resource_list.");
      return;
    }

    const hoje = dayjs().format("YYYY-MM-DD");
    console.log(`📅 Data atual: ${hoje}`);
    console.log(`🔍 Processando ${recursos.length} grupos de componentes...`);

    for (const grupo of recursos) {
      if (!grupo.componentgroup_display_name) {
        console.warn(`\n📁 Grupo: ${grupo.display_name} - ignorado`);
        continue;
      }

      console.log(`\n📁 Grupo: ${grupo.componentgroup_display_name}`);

      if (!Array.isArray(grupo.componentgroup_components)) {
        console.warn(
          "⚠️ componentgroup_components não é um array ou está ausente."
        );
        continue;
      }

      for (const componente of grupo.componentgroup_components) {
        const nome = componente.display_name;
        const historico = componente.status_history.day_wise_status_history;
        const statusHoje = historico.find((h) => h.date.startsWith(hoje));

        if (statusHoje) {
          const statusTexto =
            statusDescricao[statusHoje.status] ||
            `Código desconhecido: ${statusHoje.status}`;

            if(statusDescricao == 1){
                console.log(` - ${nome}: ${statusTexto}`);
            }else{
                console.warn(` - ${nome}: ${statusTexto}`);
            }
          
        } else {
          console.log(` - ${nome}: ⚪ Sem dados para hoje (${hoje})`);
        }
      }
    }
  } catch (e) {
    console.error("❌ Erro ao processar JSON:", e.message);
  }
}

async function main() {
  console.log("🚀 Iniciando monitoramento...");
  const sucesso = await baixarJSON();
  if (sucesso) {
    await processarStatus();
  } else {
    console.warn("⚠️ Pulando processamento porque o download falhou.");
  }
}

main();
