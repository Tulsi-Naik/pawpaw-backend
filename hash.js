const bcrypt = require("bcryptjs");

bcrypt.hash("123456", 10).then(hash => {
  console.log(hash);
});
// $2b$10$ZKbTMafrFCzQKAKsltX/NOHZgi.sWhegnEsc37SJQ2hssa.WzG./2