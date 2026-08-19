export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const consumerKey = process.env.VITE_METEO_CONSUMER_KEY || 'Mhar9YSs8LEluq4neXqP0YeHaaka';
  const consumerSecret = process.env.VITE_METEO_CONSUMER_SECRET || 'nDKPWzVr2_2o5Ej1aPZa7O6hu4Ia';

  try {
    const creds = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
    const tokenResp = await fetch('https://portail-api.meteofrance.fr/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${creds}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: 'grant_type=client_credentials'
    });

    if (!tokenResp.ok) {
      const errText = await tokenResp.text();
      return res.status(tokenResp.status).json({ error: errText });
    }

    const data = await tokenResp.json();
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
