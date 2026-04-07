import axios from "axios";

const urls = [
  "https://api.lorcast.com/v0/cards",
  "https://api.lorcast.com/v0/allCards",
  "https://api.lorcast.com/v0/card",
  "https://api.lorcast.com/v0"

];

async function test() {
  for (const url of urls) {
    try {
      console.log("TEST :", url);

      const res = await axios.get(url);

      console.log("✅ OK :", url);
      console.log(res.data.slice(0, 1));
      return;
    } catch (err) {
      console.log("❌ FAIL :", url);
    }
  }

  console.log("🚨 aucune URL ne marche");
}

test();