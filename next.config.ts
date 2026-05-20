import type { NextConfig } from "next";

import { requireProductionEnv } from "./src/lib/env";

requireProductionEnv();

const nextConfig: NextConfig = {};

export default nextConfig;
