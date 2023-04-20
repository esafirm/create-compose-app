#!/usr/bin/env node

//@ts-ignore
const fs = require('fs');
const { execSync } = require('child_process');

if (process.argv[2] === '--help') {
  console.log(`

    == Create Compose App ==

    Usage:
    - npx create-compose-app

  `);
  process.exit(0);
}

async function main() {
  interface Config {
    packageName: string;
    appName: string;
    teamId: string;
  }

  const inquirer = await import('inquirer').then((m) => m.default);
  const answers = await inquirer.prompt([
    {
      name: 'packageName',
      message: 'Package name:',
    },
    {
      name: 'appName',
      message: 'App name:',
    },
    {
      name: 'teamId',
      message: 'Team ID (for iOS):',
    },
  ]);

  const branch = process.argv[3] || 'main';

  const config = answers as Config;

  console.log('Config:', config);

  const appPackage = config.packageName;

  const zipFile = `https://github.com/esafirm/create-compose-app/archive/refs/heads/${branch}.zip`;
  const targetFile = '/tmp/template.zip';
  const targetDir = '/tmp/cca/';
  const realTargetDir = `${targetDir}create-compose-app-${branch}`;

  const options = { stdio: 'ignore' };
  const openCommand = `cd ${realTargetDir}`;

  // Printing info
  console.log(`Using ${appPackage} as app package`);

  // Prepare env
  execSync(`rm -rf ${targetFile} ${targetDir}`, options);

  // Download the zip
  console.log(`Downloading the template for branch ${branch}…`);
  execSync(`curl -L ${zipFile} --output ${targetFile}`, options);

  // Extract the zip and delete
  console.log('Extract the zip…');
  execSync(
    `mkdir -p ${targetDir} && unzip ${targetFile} "template/*" -d ${targetDir}`,
    options
  );
  execSync(`rm -rf ${targetFile}`, options);

  // Setup the package name
  console.log('Preparing report…');
  execSync(`${openCommand} && echo REACT_APP_PACKAGE=${appPackage} > .env`);

  // Creating the report
  console.log('Creating the report…');
  const outputFile = `${process.cwd()}/Guard\\ Report.html`;
  const env = `APP_PACKAGE=${appPackage}`;

  execSync(`${openCommand} && ${env} npm run create-report`, options);
  execSync(`mv ${realTargetDir}/build/index.html ${outputFile}`);

  // Cleanup
  console.log('Clean up…');
  execSync(`rm -rf ${targetDir}`);

  console.log(`Process done! Output file is in ${outputFile}`);
}

main();
