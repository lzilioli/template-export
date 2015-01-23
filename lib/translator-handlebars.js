module.exports = function( handlebars, helperFns ) {

	if ( !handlebars ) {
		throw new Error( 'Error: handlebars undefined as passed to translator.' );
	}

	var _ = require( 'underscore' );
	var path = require( 'path' );
	var util = require( 'lz-node-utils' );

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
			var theTemplates = sourceFiles.templates;

			if ( !theTemplates && sourceFiles.tmpl ) {
				theTemplates = sourceFiles.tmpl;
			}

			if ( !theTemplates ) {
				throw new Error( [
					'sourceFiles passed to translator-handlebars with no',
					'templates property.'
				].join( ' ' ) );
			}

			// Get a list of templates that are considered partials
			var partialTemplates = _.filter( theTemplates, function( val ) {
				return helperFns.isPartial( val.path );
			} );

			// Register each partial with handlebars
			_.each( partialTemplates, function( fileObj ) {
				var partialName = helperFns.getPartialName( fileObj.path );
				var partialContents = util.stripYamlFront( fileObj.contents );
				handlebars.registerPartial( partialName, partialContents );
			} );
		},
		translate: function( templateContents, model ) {
			var template = handlebars.compile( templateContents );
			return template( model );
		}
	};
};
