export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const {
    iniciarJobDeLimpezaDeExperimentos,
  } = require("./services/experimentCleanupJob");

  iniciarJobDeLimpezaDeExperimentos();
}
