const { TelegramClient } = require("telegram");
const { StringSession } = require("telegram/sessions");
const { Api } = require("telegram/tl");
const moment = require("moment-timezone");
const cron = require("node-cron");

const parseBinance = require("./parseBinance");

const input = require("input");

const apiId = 29953637;
const apiHash = "6232f946e350c38c0801ad54fed3f272";
const session = new StringSession(
    "1BQANOTEuMTA4LjU2LjE2OQG7wTOi7eT24E9DGLtW1aZyym1RfQXz2Xmf1jvEAscWNTXl4KCdAMpmk158bHRe2PCh3jVPwN+zLlI3eLO7CgA/28nhR196HHyZIyflZyVwY2zF8WTBUKL8VO2qq72m0/h52+UaBjUzUPPwsOYqIg4VwaTB5Fog6fgcezSwV8PinSnl+9yzq7SiOBZdv3VB9FNhnTopAutl3U+gsDs1gSpW4sh7GF5w9wc8f8iqLKkKGC2+5qSIPBwLmnvRLVj0vP3ZVG94Tbvxq089EbAuSJgnf3E07+aGE9PwXs7VAHdIFX6O0W5zM+V+HpUarJY16IA+4j+IZ7cgm0O6WyP3+dc+pA=="
);
const rubPercent = 10;
const thbPercent = -4;
const kzhPercent = 4;

const client = new TelegramClient(session, apiId, apiHash, {});

async function auth() {
    console.log("Loading interactive example...");
    const client = new TelegramClient(session, apiId, apiHash, {
        connectionRetries: 5
    });
    await client.start({
        phoneNumber: async () => await input.text("Please enter your number: "),
        password: async () => await input.text("Please enter your password: "),
        phoneCode: async () => await input.text("Please enter the code you received: "),
        onError: (err) => console.log(err)
    });
    console.log("You should now be connected.");
    console.log(client.session.save()); // Save this string to avoid logging in again
}

async function getMessage(id, channel) {
    try {
        const result = await client.invoke(
            new Api.channels.GetMessages({
                channel: channel,
                id: [id]
            })
        );
        return result.messages.find((mes) => mes.message.includes("Курс на сегодня:"));
    } catch (error) {
        console.error("Error fetching message:", error);
    }
}

function updateCurrencyRates(text, rubRate, usdtRate, kztRate, dateTime) {
    const rubPattern = /· RUB🇷🇺– THB \d+(\.\d+)?/;
    const usdtPattern = /· USDT💲– THB \d+(\.\d+)?/;
    const kztPattern = /· KZT 🇰🇿 - THB \d+(\.\d+)?/;
    const datePattern = /\d{2}\.\d{2}\.\d{4} \d{2}:\d{2}/;

    if (rubRate) text = text.replace(rubPattern, `· RUB🇷🇺– THB ${rubRate}`);
    if (usdtRate) text = text.replace(usdtPattern, `· USDT💲– THB ${usdtRate}`);
    if (kztRate) text = text.replace(kztPattern, `· KZT 🇰🇿 - THB ${kztRate}`);

    text = text.replace(datePattern, dateTime);

    return text;
}

async function setNewRates() {
    const rub = await parseBinance("RUB");
    const thb = await parseBinance("THB");
    const kzt = await parseBinance("KZT");

    const rubthb = rub / thb;
    const kztthb = kzt / thb;

    const rates = {
        rubthb: rub ? (rubthb + (rubthb / 100) * rubPercent)?.toFixed(2) : null,
        kztthb: kzt ? (kztthb + (kztthb / 100) * kzhPercent)?.toFixed(2) : null,
        usdthb: kzt ? (thb + (thb / 100) * thbPercent)?.toFixed(2) : null
    };

    const phuketTime = moment().tz("Asia/Bangkok").format("DD.MM.YYYY HH:mm");

    await client.connect();

    const chatId = -1001408043366; // Замените на ID вашего чата
    const messageId = 111; // Замените на ID вашего сообщения

    const message = await getMessage(messageId, chatId);

    const newMessageText = updateCurrencyRates(message.message, rates.rubthb, rates.usdthb, rates.kztthb, phuketTime);

    const media = new Api.InputMediaWebPage({
        url: "https://t.me/StatemanChannel"
    });

    const result = await client.invoke(
        new Api.messages.EditMessage({
            peer: chatId,
            id: message.id,
            media: media,
            message: newMessageText,
            entities: message.entities
        })
    );
}

// auth();

cron.schedule("*/10 * * * *", () => setNewRates().catch((err) => console.log(err, "Ошибка")));
// setNewRates();
