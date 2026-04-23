// src/lib/sqlserver.js
import sql from 'mssql';

let pool = null;

export async function getSQLServerConnection() {
  if (!pool) {
    const config = {
      server: process.env.SQL_SERVER_HOST || '172.21.50.90',
      port: parseInt(process.env.SQL_SERVER_PORT || '1433'),
      user: process.env.SQL_SERVER_USER || 'sa',
      password: process.env.SQL_SERVER_PASSWORD || 'Adm1n1str@t0r',
      database: process.env.SQL_SERVER_DATABASE || 'iAppExport',
      options: {
        encrypt: false, // set to true if using Azure or SSL
        trustServerCertificate: true, // for self-signed certs
        enableArithAbort: true,
      },
    };
    pool = await sql.connect(config);
  }
  return pool;
}

export async function querySQL(sqlQuery, params = []) {
  const pool = await getSQLServerConnection();
  const request = pool.request();
  // Add parameters if needed
  params.forEach((param, index) => {
    request.input(`param${index}`, param);
  });
  const result = await request.query(sqlQuery);
  return result.recordset;
}