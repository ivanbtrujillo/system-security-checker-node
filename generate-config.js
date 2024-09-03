const fs = require("fs");
const crypto = require("crypto");

const algorithm = "aes-256-ctr";
const secretKey = "vOVH6sdmpNWjRRIqCc7rdxs01lwHzfr3"; // Cambia esta clave por una segura

function encrypt(text) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, secretKey, iv);
  const encrypted = Buffer.concat([cipher.update(text), cipher.final()]);
  return {
    iv: iv.toString("hex"),
    content: encrypted.toString("hex"),
  };
}

const config = require("./config.json");
const encryptedConfig = encrypt(JSON.stringify(config));

const configCode = `
// Configuración encriptada
module.exports = {
  encryptedConfig: ${JSON.stringify(encryptedConfig)}
};
`;

fs.writeFileSync("src/encrypted-config.js", configCode);
console.log("Configuración encriptada generada en src/encrypted-config.js");
