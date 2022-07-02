/**
 * @fileoverview This script requires the file Baseline_ETo_Data.bin file to be created in the baselineEToData directory. More information about this is available in /baselineEToData/README.md.
 */

import * as fs from "fs";
import { ETo, FileMeta } from '.';

const DATA_FILE = __dirname + "/../../baselineEToData/Baseline_ETo_Data.bin";

export class NodeFsETo extends ETo {
	readonly #dataFilePath: string

	constructor(dataFilePath: string) {
		super()
		this.#dataFilePath = dataFilePath
	}

	/**
	 * Parses information from the baseline ETo data file from the file header. The header format is documented in the README.
	 * @return A Promise that will be resolved with the parsed header information, or rejected with an error if the header
	 * is invalid or cannot be read.
	 */
	async readFileHeader(): Promise<FileMeta> {
		return new Promise( ( resolve, reject) => {
			const stream = fs.createReadStream( this.#dataFilePath, { start: 0, end: ETo.HEADER_OFFSET } );
			const headerArray: number[] = [];

			stream.on( "error", ( err ) => {
				reject( err );
			} );

			stream.on( "data", ( data: number[] ) => {
				headerArray.push( ...data );
			} );

			stream.on( "end", () => {
				const buffer = Buffer.from( headerArray );
				const version = buffer.readUInt8( 0 );
				if ( version !== 1 ) {
					reject( `Unsupported data file version ${ version }. The maximum supported version is 1.` );
					return;
				}

				const width = buffer.readUInt32BE( 1 );
				const height = buffer.readUInt32BE( 5 );
				const fileMeta: FileMeta = {
					version: version,
					width: width,
					height: height,
					bitDepth: buffer.readUInt8( 9 ),
					minimumETo: buffer.readFloatBE( 10 ),
					scalingFactor: buffer.readFloatBE( 14 ),
					origin: {
						x: Math.floor( width / 2 ),
						// Account for the 30+10 cropped degrees.
						y: Math.floor( height / ( 180 - 10 - 30) * ( 90 - 10 ) )
					}
				};

				if ( fileMeta.bitDepth === 8 ) {
					resolve( fileMeta );
				} else {
					reject( "Bit depths other than 8 are not currently supported." );
				}
			} );
		} );
	}

	getByteAtOffset( offset: number ): Promise< number > {
		return new Promise( ( resolve, reject ) => {
			const stream = fs.createReadStream( DATA_FILE, { start: offset, end: offset } );

			stream.on( "error", ( err ) => {
				reject( err );
			} );

			// There's no need to wait for the "end" event since the "data" event will contain the single byte being read.
			stream.on( "data", ( data ) => {
				resolve( data[ 0 ] );
			} );
		} );
	}
}
