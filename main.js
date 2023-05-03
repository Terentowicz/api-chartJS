// não altere!
const serialport = require('serialport');
const express = require('express');
const mysql = require('mysql2');
const sql = require('mssql');

// não altere!
const SERIAL_BAUD_RATE = 9600;
const SERVIDOR_PORTA = 3300;

// configure a linha abaixo caso queira que os dados capturados sejam inseridos no banco de dados.
// false -> nao insere
// true -> insere
const HABILITAR_OPERACAO_INSERIR = false;

// altere o valor da variável AMBIENTE para o valor desejado:
// API conectada ao banco de dados remoto, SQL Server -> 'producao'
// API conectada ao banco de dados local, MySQL Workbench - 'desenvolvimento'
const AMBIENTE = 'desenvolvimento';

const serial = async (
    valoresDht11Umidade,
    valoresDht11Temperatura,
    valoresDht11temp1,
    valoresDht11umi1,
    valoresDht11temp2,
    valoresDht11umi2,
    valoresDht11temp3,
    valoresDht11umi3,
    valoresDht11temp4,
    valoresDht11umi4
) => {
    let poolBancoDados = ''

    if (AMBIENTE == 'desenvolvimento') {
        poolBancoDados = mysql.createPool(
            {
                // altere!
                // CREDENCIAIS DO BANCO LOCAL - MYSQL WORKBENCH
                host: 'localhost',
                user: 'USUARIO_DO_BANCO_LOCAL',
                password: 'SENHA_DO_BANCO_LOCAL',
                database: 'DATABASE_LOCAL'
            }
        ).promise();
    } else if (AMBIENTE == 'producao') {
        console.log('Projeto rodando inserindo dados em nuvem. Configure as credenciais abaixo.');
    } else {
        throw new Error('Ambiente não configurado. Verifique o arquivo "main.js" e tente novamente.');
    }


    const portas = await serialport.SerialPort.list();
    const portaArduino = portas.find((porta) => porta.vendorId == 2341 && porta.productId == 43);
    if (!portaArduino) {
        throw new Error('O arduino não foi encontrado em nenhuma porta serial');
    }
    const arduino = new serialport.SerialPort(
        {
            path: portaArduino.path,
            baudRate: SERIAL_BAUD_RATE
        }
    );
    arduino.on('open', () => {
        console.log(`A leitura do arduino foi iniciada na porta ${portaArduino.path} utilizando Baud Rate de ${SERIAL_BAUD_RATE}`);
    });
    arduino.pipe(new serialport.ReadlineParser({ delimiter: '\r\n' })).on('data', async (data) => {
        //console.log(data);
        const valores = data.split(';');
        const dht11Umidade = parseFloat(valores[0]);
        const dht11Temperatura = parseFloat(valores[1]);
        const dht11temp1 = parseFloat(valores[2]);
        const dht11umi1 = parseFloat(valores[3]);
        const dht11temp2 = parseFloat(valores[4]);
        const dht11umi2 = parseFloat(valores[5]);
        const dht11temp3 = parseFloat(valores[6]);
        const dht11umi3 = parseFloat(valores[7]);
        const dht11temp4 = parseFloat(valores[8]);
        const dht11umi4 = parseFloat(valores[9]);

        valoresDht11Umidade.push(dht11Umidade);
        valoresDht11Temperatura.push(dht11Temperatura);
        valoresDht11temp1.push(dht11temp1);
        valoresDht11umi1.push(dht11umi1);
        valoresDht11temp2.push(dht11temp2);
        valoresDht11umi2.push(dht11umi2);
        valoresDht11temp3.push(dht11temp3);
        valoresDht11umi3.push(dht11umi3);
        valoresDht11temp4.push(dht11temp4);
        valoresDht11umi4.push(dht11umi4);





        if (HABILITAR_OPERACAO_INSERIR) {
            if (AMBIENTE == 'producao') {
                // altere!
                // Este insert irá inserir os dados na tabela "medida"
                // -> altere nome da tabela e colunas se necessário
                // Este insert irá inserir dados de fk_aquario id=1 (fixo no comando do insert abaixo)
                // >> Importante! você deve ter o aquario de id 1 cadastrado.
                sqlquery = `INSERT INTO medida (dht11_umidade, dht11_temperatura, luminosidade, lm35_temperatura, chave, momento, fk_aquario) VALUES (${dht11Umidade}, ${dht11Temperatura}, ${luminosidade}, ${lm35Temperatura}, ${chave}, CURRENT_TIMESTAMP, 1)`;

                // CREDENCIAIS DO BANCO REMOTO - SQL SERVER
                // Importante! você deve ter criado o usuário abaixo com os comandos presentes no arquivo
                // "script-criacao-usuario-sqlserver.sql", presente neste diretório.
                const connStr = "Server=servidor-acquatec.database.windows.net;Database=bd-acquatec;User Id=usuarioParaAPIArduino_datawriter;Password=#Gf_senhaParaAPI;";

                function inserirComando(conn, sqlquery) {
                    conn.query(sqlquery);
                    console.log("valores inseridos no banco: ", dht11Umidade + ", " + dht11Temperatura + ", " + luminosidade + ", " + lm35Temperatura + ", " + chave)
                }

                sql.connect(connStr)
                    .then(conn => inserirComando(conn, sqlquery))
                    .catch(err => console.log("erro! " + err));

            } else if (AMBIENTE == 'desenvolvimento') {

                // altere!
                // Este insert irá inserir os dados na tabela "medida"
                // -> altere nome da tabela e colunas se necessário
                // Este insert irá inserir dados de fk_aquario id=1 (fixo no comando do insert abaixo)
                // >> você deve ter o aquario de id 1 cadastrado.
                await poolBancoDados.execute(
                    'INSERT INTO medida (dht11_umidade, dht11_temperatura, luminosidade, lm35_temperatura, chave, momento, fk_aquario) VALUES (?, ?, ?, ?, ?, now(), 1)',
                    [dht11Umidade, dht11Temperatura, luminosidade, lm35Temperatura, chave]
                );
                console.log("valores inseridos no banco: ", dht11Umidade + ", " + dht11Temperatura + ", " + luminosidade + ", " + lm35Temperatura + ", " + chave)

            } else {
                throw new Error('Ambiente não configurado. Verifique o arquivo "main.js" e tente novamente.');
            }
        }
    });
    arduino.on('error', (mensagem) => {
        console.error(`Erro no arduino (Mensagem: ${mensagem}`)
    });
}


// não altere!
const servidor = (
    valoresDht11Umidade,
    valoresDht11Temperatura,
    valoresDht11temp1,
    valoresDht11umi1,
    valoresDht11temp2,
    valoresDht11umi2,
    valoresDht11temp3,
    valoresDht11umi3,
    valoresDht11temp4,
    valoresDht11umi4
) => {
    const app = express();
    app.use((request, response, next) => {
        response.header('Access-Control-Allow-Origin', '*');
        response.header('Access-Control-Allow-Headers', 'Origin, Content-Type, Accept');
        next();
    });
    app.listen(SERVIDOR_PORTA, () => {
        console.log(`API executada com sucesso na porta ${SERVIDOR_PORTA}`);
    });
    app.get('/sensores/dht11/umidade', (_, response) => {
        return response.json(valoresDht11Umidade);
    });
    app.get('/sensores/dht11/temperatura', (_, response) => {
        return response.json(valoresDht11Temperatura);
    });
    app.get('/sensores/dht11/umi1', (_, response) => {
        return response.json(valoresDht11umi1);
    });
    app.get('/sensores/dht11/temp1', (_, response) => {
        return response.json(valoresDht11temp1);
    });
    app.get('/sensores/dht11/umi2', (_, response) => {
        return response.json(valoresDht11umi2);
    });
    app.get('/sensores/dht11/temp2', (_, response) => {
        return response.json(valoresDht11temp2);
    });
    app.get('/sensores/dht11/umi3', (_, response) => {
        return response.json(valoresDht11umi3);
    });
    app.get('/sensores/dht11/temp3', (_, response) => {
        return response.json(valoresDht11temp3);
    });
    app.get('/sensores/dht11/umi4', (_, response) => {
        return response.json(valoresDht11umi4);
    });
    app.get('/sensores/dht11/temp4', (_, response) => {
        return response.json(valoresDht11temp4);
    });
}

(async () => {
    const valoresDht11Umidade = [];
    const valoresDht11Temperatura = [];
    const valoresDht11temp1 = [];
    const valoresDht11umi1 = [];
    const valoresDht11temp2 = [];
    const valoresDht11umi2 = [];
    const valoresDht11temp3 = [];
    const valoresDht11umi3 = [];
    const valoresDht11temp4 = [];
    const valoresDht11umi4 = [];

    await serial(
        valoresDht11Umidade,
        valoresDht11Temperatura,
        valoresDht11temp1,
        valoresDht11umi1,
        valoresDht11temp2,
        valoresDht11umi2,
        valoresDht11temp3,
        valoresDht11umi3,
        valoresDht11temp4,
        valoresDht11umi4

    );
    servidor(
        valoresDht11Umidade,
        valoresDht11Temperatura,
        valoresDht11temp1,
        valoresDht11umi1,
        valoresDht11temp2,
        valoresDht11umi2,
        valoresDht11temp3,
        valoresDht11umi3,
        valoresDht11temp4,
        valoresDht11umi4
    );
})();

