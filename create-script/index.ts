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

const devMode = process.env.DEV_MODE === 'true';

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
      filter: (input: string) => {
        return input.trim();
      },
      validate: (input: string) => {
        const regex = /^[a-zA-Z0-9.]+$/;
        const isValid = regex.test(input);

        if (!isValid) {
          return 'Package name should only contains alphanumeric and dot (ex: com.example.app)';
        }
        return true;
      },
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

  const zipFile = `https://github.com/esafirm/create-compose-app/archive/refs/heads/${branch}.zip`;
  const targetFile = '/tmp/template.zip';
  const targetDir = '/tmp/cca/';

  // Printing info
  console.log('Using config', config);

  prepareTemplate(targetFile, targetDir, branch, zipFile);
  changeDirectory(targetDir, config);
  await replaceContents(targetDir, config);
  moveToTarget(targetDir, config);
}

async function moveToTarget(targetDir: string, config: Config) {
  console.log('Moving to target…');

  const directoryFromAppName = config.appName.replace(/\s/g, '-').toLowerCase();
  run(`mv ${targetDir} ${process.cwd()}/${directoryFromAppName}`);

  console.log(`Process done! Project available in ${directoryFromAppName}`);
}

function prepareTemplate(
  targetFile: string,
  targetDir: string,
  branch: string,
  zipFile: string
) {
  console.log('Prepare template…');

  // Remove existing target
  run(`rm -rf ${targetFile} ${targetDir}`);

  // In dev mode we will use the local template
  if (devMode) {
    run(
      `mkdir -p ${targetDir} && cp -r ${__dirname}/../template/. ${targetDir}`
    );
    return;
  }

  // Download the zip
  console.log(`Downloading the template for branch ${branch}…`);
  run(`curl -L ${zipFile} --output ${targetFile}`);

  // Extract the zip and delete
  console.log('Extract the zip…');
  run(
    `mkdir -p ${targetDir} && unzip ${targetFile} "template/*" -d ${targetDir}`
  );
  run(`rm -rf ${targetFile}`);
}

/**
 * Walk through a directory and execute a callback on each file
 * If the path is a file it will execute the callback directly
 *
 * @param passedPath path to walk
 * @param callback action to execute on each file
 */
async function walk(passedPath: string, callback: (file: string) => void) {
  const fs = await import('fs');
  const path = await import('path');
  if (fs.statSync(passedPath).isFile()) {
    callback(passedPath);
    return;
  }

  for (const file of fs.readdirSync(passedPath)) {
    const filepath = path.join(passedPath, file);
    if (fs.statSync(filepath).isDirectory()) {
      await walk(filepath, callback);
    } else {
      callback(filepath);
    }
  }
}

/**
 * Replace the contents of the template with the passed configuration
 *
 * @param config configuration to apply to the template
 */
async function replaceContents(targetDir: string, config: Config) {
  const pathToEdit = [
    'androidApp',
    'shared',
    'desktopApp',
    'iosApp/Configuration/Config.xcconfig',
    'settings.gradle.kts',
  ];

  const fs = await import('fs');

  for (const path of pathToEdit) {
    const realPath = `${targetDir}${path}`;

    await walk(realPath, (file) => {
      console.log(`Replacing contents in ${file}…`);

      const stat = fs.statSync(file);
      if (stat.isFile()) {
        let content = fs.readFileSync(file, 'utf8');
        content = content.replaceAll('{{PACKAGE_NAME}}', config.packageName);
        content = content.replaceAll('{{APP_NAME}}', config.appName);
        content = content.replaceAll('{{TEAM_ID}}', config.teamId);

        fs.writeFileSync(file, content, 'utf8');
      }
    });
  }
}

function changeDirectory(targetDir: string, config: Config) {
  const dirToChange = [
    {
      parent: 'androidApp/src/androidMain/kotlin',
      child: '/com/myapplication',
    },
  ];

  const dirFromPackage = config.packageName.replace(/\./g, '/');

  dirToChange.forEach((dir) => {
    console.log(`Moving ${dir.child} to ${dirFromPackage}…`);

    const parent = `${targetDir}${dir.parent}`;
    const source = `${parent}${dir.child}`;
    const target = `${parent}/${dirFromPackage}`;

    run(`mkdir -p ${target}`);
    run(`cp -r ${source}/. ${target}`);
    run(`rm -rf ${source}`);
  });
}

/**
 * Convenience function to run a command
 *
 * @param command command to run
 */
function run(command: string) {
  const options = { stdio: 'ignore' };
  execSync(command, options);
}

// Run the script
main();
