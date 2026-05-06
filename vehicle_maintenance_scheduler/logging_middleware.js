async function Log(stack, level, pkg, message) {
  const log = {
    stack,
    level,
    package: pkg,
    message,
    time: new Date().toISOString(),
  };

  console.log(log);
}

module.exports = { Log };