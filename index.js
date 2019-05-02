'use strict';
const path = require('path');
const os = require('os');
const fs = require('fs');
const ini = require('ini');

const isWindows = process.platform === 'win32';

const readRc = filePath => {
	try {
		return ini.parse(fs.readFileSync(filePath, 'utf8')).prefix;
	} catch (_) {}
};

const getEnvNpmPrefix = () => {
	if (process.env.PREFIX) {
		return process.env.PREFIX;
	}

	return Object.keys(process.env).reduce((prefix, name) => {
		return (/^npm_config_prefix$/i).test(name) ? process.env[name] : prefix;
	}, undefined);
};

const getGlobalNpmrc = () => {
	if (isWindows && process.env.APPDATA) {
		// Hardcoded contents of `c:\Program Files\nodejs\node_modules\npm\npmrc`
		const npmrc = path.join(process.env.APPDATA, '/npm/etc/npmrc');
		if (fs.existsSync(npmrc)) {
			return npmrc;
		}
	}

	// Homebrew special case: `$(brew --prefix)/lib/node_modules/npm/npmrc`
	if (process.execPath.endsWith('/Cellar/node')) {
		const homebrewPrefix = path.dirname(path.dirname(process.execPath));
		return path.join(homebrewPrefix, '/lib/node_modules/npm/npmrc');
	}
};

const getDefaultNpmPrefix = () => {
	if (isWindows) {
		// `c:\node\node.exe` → `prefix=c:\node\`
		return path.dirname(process.execPath);
	}

	// `/usr/local/bin/node` → `prefix=/usr/local`
	return path.dirname(path.dirname(process.execPath));
};

const getNpmPrefix = () => {
	const envPrefix = getEnvNpmPrefix();
	if (envPrefix) {
		return envPrefix;
	}

	const homePrefix = readRc(path.join(os.homedir(), '.npmrc'));
	if (homePrefix) {
		return homePrefix;
	}

	const globalNpmrc = getGlobalNpmrc();
	if (globalNpmrc) {
		const globalPrefix = readRc(globalNpmrc);
		return globalPrefix;
	}

	return getDefaultNpmPrefix();
};

const npmPrefix = path.resolve(getNpmPrefix());

const getYarnWindowsDirectory = () => {
	if (isWindows && process.env.LOCALAPPDATA) {
		const dir = path.join(process.env.LOCALAPPDATA, 'Yarn');
		if (fs.existsSync(dir)) {
			return dir;
		}
	}

	return false;
};

const getYarnPrefix = () => {
	if (process.env.PREFIX) {
		return process.env.PREFIX;
	}

	const windowsPrefix = getYarnWindowsDirectory();
	if (windowsPrefix) {
		return windowsPrefix;
	}

	const configPrefix = path.join(os.homedir(), '.config/yarn');
	if (fs.existsSync(configPrefix)) {
		return configPrefix;
	}

	const homePrefix = path.join(os.homedir(), '.yarn-config');
	if (fs.existsSync(homePrefix)) {
		return homePrefix;
	}

	// Yarn supports the npm conventions but the inverse is not true
	return npmPrefix;
};

exports.npm = {};
exports.npm.prefix = npmPrefix;
exports.npm.packages = path.join(npmPrefix, process.platform === 'win32' ? 'node_modules' : 'lib/node_modules');
exports.npm.binaries = process.platform === 'win32' ? npmPrefix : path.join(npmPrefix, 'bin');

const yarnPrefix = path.resolve(getYarnPrefix());
exports.yarn = {};
exports.yarn.prefix = yarnPrefix;
exports.yarn.packages = path.join(yarnPrefix, getYarnWindowsDirectory() ? 'Data/global/node_modules' : 'global/node_modules');
exports.yarn.binaries = path.join(exports.yarn.packages, '.bin');
