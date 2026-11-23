let graficoTemperatura = null;
let graficoUmidade = null;

// Formata valores numéricos
function formatar(valor, casas = 1) {
    if (valor === null || valor === undefined || !Number.isFinite(Number(valor))) {
        return "--";
    }

    return Number(valor).toFixed(casas);
}

// Calcula a média ignorando valores inválidos
function calcularMedia(sensores, campo) {
    const valores = sensores
        .map(sensor => sensor[campo])
        .filter(valor =>
            valor !== null &&
            valor !== undefined &&
            Number.isFinite(Number(valor))
        )
        .map(Number);

    if (valores.length === 0) {
        return null;
    }

    return valores.reduce((soma, valor) => soma + valor, 0) / valores.length;
}

// Atualiza os indicadores
function atualizarIndicadores(sensores) {
    document.getElementById("temperaturaMedia").textContent =
        `${formatar(calcularMedia(sensores, "temperatura"))} °C`;

    document.getElementById("umidadeMedia").textContent =
        `${formatar(calcularMedia(sensores, "umidade"))} %`;

    document.getElementById("luminosidadeMedia").textContent =
        `${formatar(calcularMedia(sensores, "luminosidade"), 0)} lux`;

    document.getElementById("precipitacaoMedia").textContent =
        `${formatar(calcularMedia(sensores, "precipitacao"))} mm`;
}

// Atualiza a tabela
function atualizarTabela(sensores) {
    const tabela = document.getElementById("tabelaSensores");
    tabela.innerHTML = "";

    if (sensores.length === 0) {
        tabela.innerHTML = `
            <tr>
                <td colspan="5">Nenhum sensor encontrado.</td>
            </tr>
        `;
        return;
    }

    sensores.forEach(sensor => {
        const linha = document.createElement("tr");

        const situacao = sensor.alertas.length > 0
            ? "Alerta"
            : "Normal";

        const valores = [
            sensor.id,
            sensor.localizacao,
            sensor.temperatura === null
                ? "Inválida"
                : `${formatar(sensor.temperatura)} °C`,
            sensor.umidade === null
                ? "Ausente"
                : `${formatar(sensor.umidade)} %`,
            situacao
        ];

        valores.forEach(valor => {
            const celula = document.createElement("td");
            celula.textContent = valor ?? "--";
            linha.appendChild(celula);
        });

        tabela.appendChild(linha);
    });
}

// Atualiza a lista de alertas
function atualizarAlertas(sensores) {
    const lista = document.getElementById("listaAlertas");
    lista.innerHTML = "";

    let quantidade = 0;

    sensores.forEach(sensor => {
        sensor.alertas.forEach(alerta => {
            const item = document.createElement("p");

            item.textContent = `${sensor.id} — ${alerta}`;
            lista.appendChild(item);

            quantidade++;
        });
    });

    if (quantidade === 0) {
        const mensagem = document.createElement("p");
        mensagem.textContent = "Nenhum alerta recebido.";
        lista.appendChild(mensagem);
    }
}

// Cria ou atualiza os gráficos
function atualizarGraficos(sensores) {
    const labels = sensores.map(sensor => sensor.id);

    const temperaturas = sensores.map(sensor =>
        sensor.temperatura
    );

    const umidades = sensores.map(sensor =>
        sensor.umidade
    );

    if (graficoTemperatura) {
        graficoTemperatura.destroy();
    }

    if (graficoUmidade) {
        graficoUmidade.destroy();
    }

    graficoTemperatura = new Chart(
        document.getElementById("graficoTemperatura"),
        {
            type: "line",
            data: {
                labels: labels,
                datasets: [{
                    label: "Temperatura (°C)",
                    data: temperaturas,
                    borderColor: "#6b8e4e",
                    backgroundColor: "#6b8e4e20",
                    fill: true,
                    tension: 0.3,
                    spanGaps: false
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true
            }
        }
    );

    graficoUmidade = new Chart(
        document.getElementById("graficoUmidade"),
        {
            type: "bar",
            data: {
                labels: labels,
                datasets: [{
                    label: "Umidade (%)",
                    data: umidades,
                    backgroundColor: "#91b8a0",
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100
                    }
                }
            }
        }
    );
}

// Busca os dados e atualiza o painel
async function atualizarDashboard() {
    const sensores = await buscarLeituras();

    if (sensores.length === 0) {
        console.error("Nenhuma leitura recebida da API.");
        return;
    }

    atualizarIndicadores(sensores);
    atualizarTabela(sensores);
    atualizarAlertas(sensores);
    atualizarGraficos(sensores);

    console.log("Dashboard atualizado:", sensores);
}

// Inicialização
document.addEventListener("DOMContentLoaded", () => {
    atualizarDashboard();

    // Atualiza os dados a cada 30 segundos
    setInterval(atualizarDashboard, 30000);
});
