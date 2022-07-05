import { BaselineEToStorage } from '@/constants';
import { ConfigurationError } from '@/errors';
import { AbstractBaselineETo } from './AbstractBaselineETo';
import CloudflareR2 from './CloudflareR2';

/**
 * @param env
 * @returns An instance of the configured Baseline ETₒ data provider.
 *
 * @throws {@link ConfigurationError}
 */
export const getBaselineEToData = async (env: Env): Promise<AbstractBaselineETo> => {
	const { BASELINE_ETO } = env
	switch (BASELINE_ETO as string) {
		case BaselineEToStorage.CloudflareR2:
			return new CloudflareR2(env.BASELINE_ETO_R2_BUCKET, env.BASELINE_ETO_R2_PATH)
	}

	throw new ConfigurationError(`Unknown Baseline ETₒ data store (${BASELINE_ETO})`)
}