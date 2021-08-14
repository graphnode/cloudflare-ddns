import shell from 'shelljs';

if (!shell.which('docker')) {
  shell.echo('Sorry, this script requires docker');
  shell.exit(1);
}

shell.exec('docker build -t graphnode/cloudflare-ddns .');
shell.exec('docker stop cloudflare-ddns');
shell.exec('docker rm cloudflare-ddns');
shell.exec('docker run --name cloudflare-ddns -d graphnode/cloudflare-ddns');
