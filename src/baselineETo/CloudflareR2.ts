/**
 * @fileoverview Fetch baseline evapotranspiration (ETo) data from Cloudflare R2.
 */

import { AbstractBaselineETo } from './AbstractBaselineETo'
import { EToDataUnavailableError, EToError } from './errors'

/**
 *
 */
export default class CloudflareR2 extends AbstractBaselineETo {
	protected static FILE = 'Baseline_ETo_Data.bin'
	private readonly bucket: R2Bucket
	private readonly path: string

	constructor(bucket: R2Bucket, path?: string) {
		super()
		this.bucket = bucket
		this.path = path ?? ''
	}

	async readFileHeader() {
		const header = await this.bucket.get(this.getR2Key(), {
			range: {
				offset: 0,
				length: AbstractBaselineETo.HEADER_OFFSET
			}
		}) as R2ObjectBody | null

		if (!header) {
			throw new EToDataUnavailableError(`Data file not found (${this.getR2Key()}).`, { statusCode: 503 })
		}

		const dataView = new DataView(await header.arrayBuffer())

		const version = dataView.getUint8(0)
		if (version > AbstractBaselineETo.MAX_VERSION) {
			throw new EToError(`Unsupported data file version ${version}. The maximum supported version is ${AbstractBaselineETo.MAX_VERSION}.`)
		}
		const width = dataView.getUint32(1, false)
		const height = dataView.getUint32(5, false)
		const bitDepth = dataView.getUint8(9)
		if (bitDepth !== 8) {
			throw new EToError(`Bit depths other than 8 are not currently supported.`)
		}
		const minimumETo = dataView.getFloat32(10, false)
		const scalingFactor = dataView.getFloat32(14, false)

		this.fileMetadata = {
			version, width, height, bitDepth, minimumETo, scalingFactor,
			origin: {
				x: Math.floor(width / 2),
				y: Math.floor(height / (180 - 10 - 30) * (90 - 10))
			}
		}
	}

	async getByteAtOffset(offset: number, relative: boolean) {
		const data = await this.bucket.get(this.getR2Key(), {
			range: {
				offset: offset + (relative ? AbstractBaselineETo.HEADER_OFFSET : 0),
				length: 1,
			}
		}) as R2ObjectBody

		return data.body.getReader().read().then(result => result.value)
	}

	private getR2Key() {
		return `${this.path}${CloudflareR2.FILE}`
	}
}