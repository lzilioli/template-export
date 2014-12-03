module.exports = function( handlebars, helperFns ) {

	if ( !handlebars ) {
		throw new Error( 'Error: handlebars undefined as passed to translator.' );
	}

	var util = require( 'lz-node-utils' );
	var _ = require( 'underscore' );
	var path = require( 'path' );
	var fs = require( 'fs' );

	helperFns = helperFns || {};
	helperFns = _.defaults( helperFns, {
		getPartialName: function( partialPath ) {
			// The relative path of the partial from sourceDir, without the .tmpl extension
			return partialPath.replace( '.tmpl', '' );
		},
		// Something is considered a partial if the filename begins with `_`
		isPartial: function( filePath ) {
			return path.basename( filePath )[ 0 ] === '_';
		}
	} );

	return {
		init: function( sourceFiles ) {
			if ( !sourceFiles.templates ) {
				throw new Error( [
					'sourceFiles passed to translator-handlebars with no',
					'templates property.'
				].join( ' ' ) );
			}

			// Get a list of templates that are considered partials
			var partialTemplates = _.filter( sourceFiles.templates, helperFns.isPartial );
			// Register each partial with handlebars
			_.each( partialTemplates, function( filePath ) {
				var partialName = helperFns.getPartialName( filePath );
				var partialContents = util.stripYamlFront( readFile( filePath ) );
				handlebars.registerPartial( partialName, partialContents );
			} );
		},
		translate: function( templateContents, model ) {
			var template = handlebars.compile( templateContents );
			return template( model );
		}
	};

	function readFile( toRead ) {
		if ( !fs.existsSync( toRead ) ) {
			throw new Error( 'file does not exist: ' + toRead );
		} else {
			return fs.readFileSync( toRead ).toString();
		}
	}
};
