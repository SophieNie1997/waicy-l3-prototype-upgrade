"use strict";

const { handleGenerateComic } = require("./generate-comic-core");

module.exports = async function handler(req, res) {
  await handleGenerateComic(req, res);
};
