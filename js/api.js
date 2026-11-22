const API_URL = "http://localhost:8000/api/leituras?formato=json";

// Busca as leituras da API
async function buscarLeituras() {
    try {
        const resposta = await fetch(API_URL);

        if (!resposta.ok) {
            throw new Error(`Erro HTTP: ${resposta.status}`);
        }

        const dados = await resposta.json();

        return tratarLeituras(dados.leituras || []);

    } catch (erro) {
        console.error("Erro ao buscar API:", erro);
        return [];
    }
}

// Padroniza os dados recebidos
function tratarLeituras(leituras) {
    return leituras.map(sensor => {

        let temperatura = sensor.temperatura;

        // Conversão Fahrenheit para Celsius
        if (temperatura !== null && temperatura !== undefined && temperatura > -100) {
            if (sensor.unidade_temp === "F") {
                temperatura = (temperatura - 32) * 5 / 9;
            }
        } else {
            temperatura = null;
        }

        // Converte horário para UTC-3
        const horario = sensor.timestamp
            ? new Date(sensor.timestamp).toLocaleString("pt-BR", {
                timeZone: "America/Fortaleza"
            })
            : "Não informado";

        // Identifica alertas
        const alertas = [];

        if (temperatura === null) {
            alertas.push("Temperatura inválida");
        } else if (temperatura > 35) {
            alertas.push("Calor crítico");
        }

        if (sensor.umidade === null) {
            alertas.push("Umidade ausente");
        } else if (sensor.umidade < 25) {
            alertas.push("Seca crítica");
        }

        return {
            id: sensor.sensor_id,
            localizacao: sensor.localizacao,
            horario: horario,
            temperatura: temperatura,
            umidade: sensor.umidade,
            luminosidade: sensor.luminosidade,
            precipitacao: sensor.precipitacao,
            alertas: alertas,
            status: alertas.length > 0 ? "Alerta" : "Normal"
        };
    });
}