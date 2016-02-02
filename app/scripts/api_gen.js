'use strict'

var argv = require('yargs')
	.usage('Usage: $0 [options]')
	.help('h')
	.strict()
	.options({
		spec: {
			alias: 's',
			decription: 'Path to the spec file',
			required: true,
			type: 'string',
			// default: '../../server_api_spec.json'
			default: '../../definitions.json'
		},
		outDir: {
			alias: 'o',
			decription: 'Output dir where genereated files should be put',
			required: true,
			type: 'string',
			default: './src/gen/api'
		},
		moduleName: {
			alias: 'n',
			description: 'TypeScript module name where generated classes are put',
			required: true,
			type: 'string',
			default: 'gen.api'
		}
	})
	.argv,
	path = require('path'),
	fs = require('fs'),
	mkdirp = require('mkdirp');

var spec = require(argv.spec);

function generateDefinitions() {
	var typeDefs = {};
	var primitiveDefs = {};

	parseDefinitions(typeDefs, primitiveDefs);
	resolveReferences(typeDefs, primitiveDefs);

	return typeDefs;
}

function parseDefinitions(typeDefs, primitiveDefs) {
	Object.keys(spec.definitions).forEach(function(defName) {
		var def = spec.definitions[defName];

		if (def.type === "object") {
			var type = typeDefs[defName] = {};

			type.properties = {};
			type.enums = {};

			Object.keys(def.properties).map(function(propName) {
				var prop = def.properties[propName];
				type.properties[propName] = prop;
				type.properties[propName]['required'] = def.required ? (def.required.indexOf(propName) !== -1) : false;

				var enumName = prop['x-ts-enum'];
				var enumItems = prop.enum;
				if (enumName && enumItems) {
					type.enums[enumName] = enumItems;
				}
			});

		} else {
			primitiveDefs[defName] = def;
		}
	});
}

function resolveReferences(typeDefs, primitiveDefs) {
	var refRegExp = /^#\/definitions\/(\w*)$/;

	Object.keys(typeDefs).forEach(function(typeName) {
		var type = typeDefs[typeName];
		type.refs = [];

		Object.keys(type.properties).forEach(function(propName) {
			var prop = type.properties[propName];

			var refString;
			var propType;
			if (prop.type == 'array') {
				prop.array = true;
				refString = prop.items['$ref'];
				if (!refString) {
					prop.type = prop.items.type
				}
			} else {
				refString = prop['$ref'];
			}

			if (!refString)
				return;

			propType = refString.match(refRegExp)[1];

			if (primitiveDefs[propType]) {
				prop.type = primitiveDefs[propType].type;
				prop['x-ts-type'] = primitiveDefs[propType]['x-ts-type'];
				prop.format = primitiveDefs[propType].format || undefined;
			} else {
				prop.type = propType;
				if (type.refs.indexOf(propType) == -1)
					type.refs.push(propType)
			}

		});
	});
}

var swaggerToTypescriptType = {
	'integer': 'number'
};

function convertSwaggerTypeToTypescript(typeName) {
	return swaggerToTypescriptType[typeName] || typeName;
}

function writeStrings(ws, strings) {
	strings.forEach(function(s) {
		ws.write(s);
	});
}

function writeGenWarning(ws) {
	ws.write('// WARNING - GENERATED FILE, DO NOT CHANGE - WARNING\n\n');
}

var indent = '    ';
var newline = '\n';

function writeTypeFile(typeName, typeDef) {
	var filePath = path.join(argv.outDir, typeName + '.ts');

	console.log('Generating ' + filePath + '...');

	var ws = fs.createWriteStream(filePath, {
		flags: 'w+'
	});

	writeGenWarning(ws);

	typeDef.refs.forEach(function(ref) {
		if (ref === typeName)
			return;

		writeStrings(ws, ['/// <reference path="', ref, '.ts" />', newline]);
	});
	ws.write(newline);

	writeStrings(ws, ['module ', argv.moduleName, ' {', newline, newline]);

	writeTypeDefsWithoutModuleToFile(ws, typeName, typeDef, indent);	

	writeStrings(ws, ['}']);

	ws.end();
}

function writeTypeDefsWithoutModuleToFile(ws, typeName, typeDef, globalIndent) {
	writeStrings(ws, [globalIndent, 'export interface ' + typeName + ' {', newline]);

	Object.keys(typeDef.properties).forEach(function(propName) {
		var prop = typeDef.properties[propName];
		var type = prop.type ? convertSwaggerTypeToTypescript(prop.type) : prop['x-ts-type'];
		type = type || 'any';
		writeStrings(ws, [globalIndent, indent, propName, prop.required ? '' : '?', ': ', type, prop.array ? '[]' : '', ';', newline]);
	});

	writeStrings(ws, [globalIndent, '}', newline, newline]);

	Object.keys(typeDef.enums).forEach(function(enumName) {
		var enumValues = typeDef.enums[enumName];
		writeStrings(ws, [globalIndent, 'export enum ', enumName, ' {', newline]);
		enumValues.forEach(function(value) {
			writeStrings(ws, [globalIndent, indent, value, ',', newline]);
		});
		writeStrings(ws, [globalIndent, '}', newline, newline]);

		writeStrings(ws, [
			globalIndent, 'export function ', 'fromString_', enumName, '(s: string): ', enumName ,' {', newline,
			globalIndent, indent, 'return ', enumName, '[s];', newline,
			globalIndent, '}', newline,
			newline
			]);
	});
}

function writeFiles(typeDefs) {
	mkdirp(argv.outDir, function(err) {
		if (err)
			throw err;

		Object.keys(typeDefs).forEach(function(typeName) {
			writeTypeFile(typeName, typeDefs[typeName]);
		});
	});
}

var defs = generateDefinitions();
writeFiles(defs);