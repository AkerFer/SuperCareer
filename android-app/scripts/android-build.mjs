import {spawnSync} from 'node:child_process';
import {existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const android = fileURLToPath(new URL('../android/',import.meta.url));
const env={...process.env};
if(!env.JAVA_HOME && existsSync('/workspace/football-legacy-jdk/bin/javac'))env.JAVA_HOME='/workspace/football-legacy-jdk';
if(!env.ANDROID_HOME && existsSync('/workspace/android-sdk/platforms'))env.ANDROID_HOME='/workspace/android-sdk';
const args=[];
if(existsSync('/etc/codex/network-policy.json') && existsSync('/etc/ssl/certs/java/cacerts'))args.push('-Djavax.net.ssl.trustStore=/etc/ssl/certs/java/cacerts');
if(env.HTTPS_PROXY){
  const proxy=new URL(env.HTTPS_PROXY);
  if(proxy.username||proxy.password)throw new Error('Authenticated proxy: configure Gradle credentials securely outside the repository.');
  for(const protocol of ['https','http'])args.push(`-D${protocol}.proxyHost=${proxy.hostname}`,`-D${protocol}.proxyPort=${proxy.port||80}`);
}
args.push('assembleDebug','--no-daemon','--max-workers=2');
const windows=process.platform==='win32';
const result=spawnSync(windows?'gradlew.bat':'./gradlew',args,{cwd:android,env,stdio:'inherit',shell:windows});
if(result.error)console.error(result.error.message);
process.exit(result.status??1);
