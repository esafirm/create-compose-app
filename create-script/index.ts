#!/usr/bin/env node

//@ts-ignore
const { execSync } = require('child_process');

if (process.argv[2] === '--help') {
  console.log(`

    == Create Compose App ==

    Usage:
    - npx create-compose-app

  `);
  process.exit(0);
}

interface Config {
  packageName: string;
  appName: string;
  teamId: string;
}

/**
 * Entry point for the script
 */
async function main() {
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

/**
 * Walk through a directory and execute a callback on each file
 *
 * @param dir directory to walk
 * @param callback action to execute on each file
 */
async function walk(dir: string, callback: (file: string) => void) {
  const fs = await import('fs').then((m) => m.default);
  const path = await import('path').then((m) => m.default);

  fs.readdirSync(dir).forEach((file) => {
    const filepath = path.join(dir, file);
    callback(filepath);
  });
}

/**
 * Replace the contents of the template with the passed configuration
 *
 * @param config configuration to apply to the template
 */
async function replaceContents(config: Config) {
  const directoryToEdit = [
    'androidApp',
    'shared',
    'iosApp/Configuration/Config.xcconfig',
    'settings.gradle.kts',
  ];

  const fs = await import('fs').then((m) => m.default);

  directoryToEdit.forEach((dir) => {
    walk(dir, (file) => {
      let content = fs.readFileSync(file, 'utf8');
      content = content.replaceAll('{{PACKAGE_NAME}}', config.packageName);
      content = content.replaceAll('{{APP_NAME}}', config.appName);
      content = content.replaceAll('{{TEAM_ID}}', config.teamId);

      fs.writeFileSync(file, content, 'utf8');
    });
  });
}

// Run the script
main();
