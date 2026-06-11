import { colab } from './src/lib/colab-manager.js';

async function stopColab() {
  console.log("Stopping Colab instance...");
  try {
    await colab.stop();
    console.log("Colab stopped successfully.");
  } catch (err) {
    console.error("Failed to stop Colab:", err);
  }
}

stopColab();
