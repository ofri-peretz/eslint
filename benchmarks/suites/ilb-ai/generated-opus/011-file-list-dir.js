const fs = require("fs");
const path = require("path");
function listUserFiles(userId) {
  const userDir = path.join("/users", String(userId));
  const resolvedPath = path.resolve(userDir);
  if (!resolvedPath.startsWith("/users/")) {
    throw new Error("Invalid userId");
  }
  return fs.readdirSync(resolvedPath);
}
