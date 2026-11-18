// Kjører oppdateringen av kalenderlenker én gang. Brukes av GitHub Actions hver 3. time.
import runSync from '../server/feeds-sync.mjs';
await runSync(process.env);
console.log('feeds-sync ferdig');
