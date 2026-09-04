// @ts-nocheck
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import { getInfoOrEmptyDataAfterTimeout } from '../helpers';
import { TWebGL, TWebGLInfo } from './types';
import { Categories, WebGL2Constants, WebGLConstants } from './webgl.json';

function getMaxAnisotropy(context: WebGLRenderingContext) {
    try {
        const extension =
            context.getExtension('EXT_texture_filter_anisotropic') ??
            context.getExtension('WEBKIT_EXT_texture_filter_anisotropic') ??
            context.getExtension('MOZ_EXT_texture_filter_anisotropic');
        return context.getParameter(extension.MAX_TEXTURE_MAX_ANISOTROPY_EXT);
    } catch (error) {
        console.error(error);
        return undefined;
    }
}

function getMaxDrawBuffers(context: WebGLRenderingContext) {
    try {
        const extension =
            context.getExtension('WEBGL_draw_buffers') ||
            context.getExtension('WEBKIT_WEBGL_draw_buffers') ||
            context.getExtension('MOZ_WEBGL_draw_buffers');
        return context.getParameter(extension.MAX_DRAW_BUFFERS_WEBGL);
    } catch (error) {
        return undefined;
    }
}

function getShaderData(precisionFormat: { [x: string]: WebGLShaderPrecisionFormat } | undefined) {
    const shaderData: { [x: string]: WebGLShaderPrecisionFormat } = {};
    try {
        if (precisionFormat) {
            Object.keys(precisionFormat).forEach((key) => {
                const shaderPrecisionFormat = precisionFormat[key];
                shaderData[key] = {
                    precision: shaderPrecisionFormat.precision,
                    rangeMax: shaderPrecisionFormat.rangeMax,
                    rangeMin: shaderPrecisionFormat.rangeMin,
                };
            });
        }
        return shaderData;
    } catch (error) {
        return undefined;
    }
}

function getShaderPrecisionFormat(context: WebGLRenderingContext, shaderType: string) {
    const precisionTypes = ['LOW_FLOAT', 'MEDIUM_FLOAT', 'HIGH_FLOAT'];
    const precisionFormat: {
        [key: string]: WebGLShaderPrecisionFormat | null;
    } = {};

    try {
        precisionTypes.forEach((prop) => {
            precisionFormat[prop] = context.getShaderPrecisionFormat(context[shaderType], context[prop]);
        });
        return precisionFormat;
    } catch (error) {
        return undefined;
    }
}

function getUnmasked(context, constant) {
    try {
        const extension = context.getExtension('WEBGL_debug_renderer_info');
        return context.getParameter(extension[constant]);
    } catch (error) {
        return undefined;
    }
}

function getNumericValues(parameters: object) {
    if (!parameters) return [];
    return [
        ...new Set(
            Object.values(parameters)
                .filter((val) => val && typeof val !== 'string')
                .flat()
                .map((val) => Number(val) || 0)
        ),
    ].sort((a, b) => a - b);
}

function getGpuBrand(gpu: string) {
    if (!gpu) return '';
    const gpuBrandMatcher =
        /(adreno|amd|apple|intel|llvm|mali|microsoft|nvidia|parallels|powervr|samsung|swiftshader|virtualbox|vmware)/i;
    let brand;
    if (/radeon/i.test(gpu)) {
        brand = 'AMD';
    } else if (/geforce/i.test(gpu)) {
        brand = 'NVIDIA';
    } else {
        brand = (gpuBrandMatcher.exec(gpu) || [])[0] || 'Other';
    }
    return brand;
}

function getWebGL(contextType: string): [object, string[]] {
    const errors = [];
    let data = {};
    const isWebGL = /^webgl$/;
    const isWebGL2 = /^webgl2$/;

    const supportsWebGL = isWebGL.test(contextType) && 'WebGLRenderingContext' in window;

    const supportsWebGL2 = isWebGL2.test(contextType) && 'WebGL2RenderingContext' in window;

    if (!supportsWebGL && !supportsWebGL2) {
        errors.push('not supported');
        return [data, errors];
    }

    let canvas;
    let context: RenderingContext | CanvasRenderingContext2D | WebGLRenderingContext | null;
    let hasMajorPerformanceCaveat;

    try {
        canvas = document.createElement('canvas');
        context = canvas.getContext(contextType, {
            failIfMajorPerformanceCaveat: true,
        });
        if (!context) {
            hasMajorPerformanceCaveat = true;
            context = canvas.getContext(contextType);
            if (!context) {
                throw new Error(`context of type ${typeof context}`);
            }
        }
    } catch (err) {
        console.error(err);
        errors.push('context blocked');
        return [data, errors];
    }

    let webGLExtensions;
    try {
        webGLExtensions = (context as WebGLRenderingContext).getSupportedExtensions();
    } catch (error) {
        console.error(error);
        errors.push('extensions blocked');
    }

    let parameters: { [x: string]: unknown } = {};
    try {
        const VERTEX_SHADER = getShaderData(
            getShaderPrecisionFormat(context as WebGLRenderingContext, 'VERTEX_SHADER')
        );
        const FRAGMENT_SHADER = getShaderData(
            getShaderPrecisionFormat(context as WebGLRenderingContext, 'FRAGMENT_SHADER')
        );
        const antialiasContext =
            context === null || context === undefined
                ? undefined
                : (context as WebGLRenderingContext).getContextAttributes();
        parameters = {
            ANTIALIAS:
                antialiasContext === null || antialiasContext === undefined ? undefined : antialiasContext.antialias,
            CONTEXT: contextType,
            MAJOR_PERFORMANCE_CAVEAT: hasMajorPerformanceCaveat,
            MAX_TEXTURE_MAX_ANISOTROPY_EXT: getMaxAnisotropy(context as WebGLRenderingContext),
            MAX_DRAW_BUFFERS_WEBGL: getMaxDrawBuffers(context as WebGLRenderingContext),
            VERTEX_SHADER,
            VERTEX_SHADER_BEST_FLOAT_PRECISION: Object.values(
                VERTEX_SHADER === null || VERTEX_SHADER === undefined ? undefined : VERTEX_SHADER.HIGH_FLOAT
            ),
            FRAGMENT_SHADER,
            FRAGMENT_SHADER_BEST_FLOAT_PRECISION: Object.values(
                FRAGMENT_SHADER === null || FRAGMENT_SHADER === undefined ? undefined : FRAGMENT_SHADER.HIGH_FLOAT
            ),
            UNMASKED_VENDOR_WEBGL: getUnmasked(context, 'UNMASKED_VENDOR_WEBGL'),
            UNMASKED_RENDERER_WEBGL: getUnmasked(context, 'UNMASKED_RENDERER_WEBGL'),
        };
        const glConstants = [...WebGLConstants, ...(supportsWebGL2 ? WebGL2Constants : [])];
        glConstants.forEach((key) => {
            const result =
                context === null || context === undefined
                    ? undefined
                    : (context as WebGLRenderingContext).getParameter(context[key]);
            const typedArray = result && (result.constructor === Float32Array || result.constructor === Int32Array);
            parameters[key] = typedArray ? [...result] : result;
        });
        parameters.RGBA_BITS = [
            parameters.RED_BITS,
            parameters.GREEN_BITS,
            parameters.BLUE_BITS,
            parameters.ALPHA_BITS,
        ];
        parameters.DEPTH_STENCIL_BITS = [parameters.DEPTH_BITS, parameters.STENCIL_BITS];
        parameters.DIRECT_3D = /Direct3D|D3D(\d+)/.test(parameters.UNMASKED_RENDERER_WEBGL);
    } catch (error) {
        console.error(error);
        errors.push('parameters blocked');
    }
    const gpu = String([parameters.UNMASKED_VENDOR_WEBGL, parameters.UNMASKED_RENDERER_WEBGL]);

    const gpuBrand = getGpuBrand(gpu);
    const components: { [x: string]: { [x: string]: unknown } } = {};
    if (parameters) {
        Object.keys(Categories).forEach((name) => {
            const componentData: { [x: string]: unknown } = Categories[name as keyof typeof Categories].reduce(
                (acc: { [x: string]: unknown }, key: string) => {
                    if (parameters[key] !== undefined) {
                        acc[key] = parameters[key];
                    }
                    return acc;
                },
                {}
            );
            if (Object.keys(componentData).length) {
                components[name] = componentData;
            }
        });
    }
    data = {
        gpuHash: !parameters ? undefined : [gpuBrand, ...getNumericValues({ ...parameters })].join(':'),
        gpu,
        gpuBrand,
        ...components,
        webGLExtensions,
    };
    return [data, errors];
}

export default async function getWebGLInfo(waitTime: number): Promise<TWebGLInfo> {
    const abortData = { result: {}, errors: [] };
    const fn = (type: 'webgl' | 'webgl2') => () => {
        try {
            const data = getWebGL(type);
            return { result: data[0], errors: data[1] };
        } catch {
            return { ...abortData };
        }
    };

    const webGL = await getInfoOrEmptyDataAfterTimeout<TWebGL>(waitTime, fn('webgl'), { ...abortData });

    const webGL2 = await getInfoOrEmptyDataAfterTimeout<TWebGL>(waitTime, fn('webgl2'), { ...abortData });

    return {
        webGL,
        webGL2,
    };
}
