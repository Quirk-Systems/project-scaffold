/**
 * Allow application-level stylesheet side-effect imports during a clean
 * `tsc --noEmit` run, before Next.js has generated any local type artifacts.
 */
declare module "*.css";
