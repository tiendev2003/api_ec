import Config from '@/config';
import BrandModel from '@/database/model/brand';
import CategoryModel from '@/database/model/category';
import ProductModel from '@/database/model/product';
import { join } from 'node:path';
import { AppError } from '../errors';
import { AsyncSafeResult } from '../types';
import { removeFile } from '../utils';
import * as Helper from './helper';
import type * as T from './interfaces';

export async function createProduct(
  data: T.ProductData,
  adminId: string,
): AsyncSafeResult<T.ProductResponse> {
  try {
    const productModelData: T.ProductCreationData = {
      ...data,
      imagesURL: data.imagesUrl,
      addedBy: adminId,
    };
    if (data.brandId) {
      const brand = await BrandModel.findById(data.brandId);
      if (!brand) throw AppError.invalid('Invalid Brand id ' + data.brandId);
      productModelData.brand = brand._id.toString();
      productModelData.brandName = brand.name;
    }
    if (data.categoryId) {
      const category = await CategoryModel.findById(data.categoryId);
      if (!category) throw AppError.invalid('Invalid Brand id ' + data.categoryId);
      productModelData.category = category._id;
    }
    const product = await ProductModel.create(productModelData);
    const result: T.ProductResponse = Helper._formatProduct(product);
    return { result, error: null };
  } catch (err) {
    return { error: err, result: null };
  }
}

export async function getProductForUser(id: string): AsyncSafeResult<T.ProductResponse> {
  try {
    const product = await Helper._getProduct(id);
    const result: T.ProductResponse = Helper._formatProduct(product);
    return { result, error: null };
  } catch (err) {
    return { error: err, result: null };
  }
}

export async function getProductForAdmin(id: string): AsyncSafeResult<unknown> {
  try {
    const product = (await Helper._getProduct(id)).toObject();
    const productResult = {
      ...product,
      id: product._id.toString(),
    };
    return { result: productResult, error: null };
  } catch (err) {
    return { error: err, result: null };
  }
}

export async function getProductsList(
  options: T.ProductOptions,
): AsyncSafeResult<T.ProductItemsApiList> {
  try {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const skipDocsNumber = (page - 1) * limit;
    const productsQuery = ProductModel.find(Helper._filterProduct(options.filter));
    Helper._sortProduct(productsQuery, options.sort);
    const products = await productsQuery.skip(skipDocsNumber).limit(limit).exec();
    const count = await ProductModel.countDocuments(Helper._filterProduct(options.filter));
    const result: T.ProductItemsApiList = {
      products: products.map(p => Helper._formatItemProductList(p)),
      count: products.length,
      page: page,
      totalItems: count,
      totalPages: Math.ceil(count / limit),
    };
    return { result, error: null };
  } catch (error) {
    return { result: null, error };
  }
}

export async function updateProduct(
  id: string,
  productData: Partial<T.ProductData>,
): AsyncSafeResult<T.ProductData> {
  try {
    const product = await ProductModel.findByIdAndUpdate(
      id,
      {
        $set: {
          imagesURL: productData.imagesUrl,
          ...productData,
        },
      },
      { new: true },
    );
    if (!product) throw AppError.invalid('Product with' + id + ' not found.');
    return { result: Helper._formatProduct(product), error: null };
  } catch (err) {
    return { error: err, result: null };
  }
}

export async function removeProduct(id: string): Promise<Error | null> {
  try {
    const product = await Helper._getProduct(id);
    for (const image of product.imagesURL) {
      await removeFile(join(Config.ProductImagesDir, image));
    }
    await ProductModel.findByIdAndDelete(id);
    return null;
  } catch (err) {
    return err;
  }
}

export async function productsInfo(): AsyncSafeResult<T.ProductsInfo> {
  try {
    const productsInfo = await ProductModel.aggregate([
      { $unwind: { path: '$sizes', preserveNullAndEmptyArrays: true } },
      { $unwind: { path: '$colors', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: null,
          maxPrice: { $max: '$price' },
          minPrice: { $min: '$price' },
          sizes: { $addToSet: '$sizes' },
          colors: { $addToSet: { name: '$colors.name', hex: '$colors.hex' } },
        },
      },
      { $project: { _id: 0 } },
    ]);
    const info = productsInfo[0];
    return { result: info, error: null };
  } catch (err) {
    return { error: err, result: null };
  }
}
