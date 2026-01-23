module.exports.handler = async function () {
    return { statusCode: 200, body: JSON.stringify({ ok: true, mode: process.env.API_KEY ? 'server' : 'dev' }) };
};
