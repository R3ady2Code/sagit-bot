const axios = require("axios");
const cheerio = require("cheerio");

async function fetchRate(symbol) {
    try {
        const response = await axios.get(`https://www.binance.com/ru/price/tether/${symbol}`);
        const html = response.data;

        const $ = cheerio.load(html);

        const data = $(".css-1bwgsh3").text();

        console.log(Number(data.split(" ")[1]));

        return Number(data.split(" ")[1]);
    } catch (error) {
        console.error("Ошибка при парсинге страницы:", error);
    }
}

module.exports = fetchRate;
