import {defineConfig} from 'vite';
// base './' keeps every URL relative, so the build works at https://<user>.github.io/<repo>/ and from file://
// assetsDir 'app' keeps the bundled JS apart from the repo's original assets/ folder.
export default defineConfig({base:'./',build:{assetsDir:'app'},server:{host:'0.0.0.0',allowedHosts:true,port:3000,strictPort:true},preview:{host:'0.0.0.0',allowedHosts:true,port:3000,strictPort:true}});
