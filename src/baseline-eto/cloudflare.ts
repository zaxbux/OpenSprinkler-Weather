/**
 * @fileoverview Fetch baseline evapotranspiration (ETo) data from Cloudflare R2.
 */

import { ETo, EToError } from '.';

export default class CloudflareWorkersETo extends ETo {
	readonly #bucket: R2Bucket

	constructor(bucket: R2Bucket) {
		super()
		this.#bucket = bucket
	}

	async readFileHeader() {
		const header = await this.#bucket.get(`Baseline_ETo_Data.bin`, {
			range: {
				offset: 0,
				length: ETo.HEADER_OFFSET
			}
		}) as R2ObjectBody | null

		const dataView = new DataView(await header!.arrayBuffer())

		const version = dataView.getUint8(0)
		if (version > ETo.MAX_VERSION) {
			throw new EToError(`Unsupported data file version ${version}. The maximum supported version is ${ETo.MAX_VERSION}.`)
		}
		const width = dataView.getUint32(1, false)
		const height = dataView.getUint32(5, false)
		const bitDepth = dataView.getUint8(9)
		if (bitDepth !== 8) {
			throw new EToError(`Bit depths other than 8 are not currently supported.`)
		}
		const minimumETo = dataView.getFloat32(10, false)
		const scalingFactor = dataView.getFloat32(14, false)

		this.FILE_META = {
			version, width, height, bitDepth, minimumETo, scalingFactor,
			origin: {
				x: Math.floor(width / 2),
				y: Math.floor(height / (180 - 10 - 30) * (90 - 10))
			}
		}
	}

	async getByteAtOffset(offset: number) {
		const byte = await this.#bucket.get(`Baseline_ETo_Data.bin`, {
			range: {
				offset,
				length: 1,
			}
		}) as R2ObjectBody

		return byte.body.getReader().read().then(result => result.value)
	}
}