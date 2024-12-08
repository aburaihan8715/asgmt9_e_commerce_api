import AppError from '../../errors/AppError';
import httpStatus from 'http-status';
import { Product } from './product.model';
import { IProduct } from './product.interface';
import { TFiles } from '../../interface/file.interface';
import QueryBuilder from '../../builder/QueryBuilder';
import { IShop } from '../shop/shop.interface';
import { IUser } from '../user/user.interface';

const createProductIntoDB = async (files: TFiles, payload: IProduct) => {
  if (files && files.length > 0) {
    const images = files.map((file) => file.path);
    payload.images = images;
  }
  const result = await Product.create(payload);

  return result;
};

const updateProductIntoDB = async (
  productId: string,
  currentUserId: string,
  files: TFiles,
  payload: Partial<IProduct>,
) => {
  // Check if Product exists
  const product = await Product.findById(productId);

  if (!product) {
    throw new AppError(httpStatus.NOT_FOUND, 'Product not found!');
  }

  const shop = product.shop as IShop;
  const shopId = shop._id;
  const vendor = shop.vendor as IUser;
  const vendorId = vendor._id;

  // Authorization check
  const isAuthorized = vendorId.toString() === currentUserId;

  if (!isAuthorized) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'You are not authorized to delete this Product!',
    );
  }

  if (files && files.length > 0) {
    const images = files.map((file) => file.path);
    payload.images = images;
  }

  const updatedProduct = await Product.findOneAndUpdate(
    { _id: productId, shop: shopId },
    payload,
    { new: true, runValidators: true },
  );

  if (!updatedProduct) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      'Product not found or does not match the vendor!',
    );
  }

  return updatedProduct;
};

const getAllProductsFromDB = async (query: Record<string, unknown>) => {
  const productQuery = new QueryBuilder(Product.find(), query)
    .search(['name', 'description'])
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await productQuery.modelQuery;
  const meta = await productQuery.calculatePagination();

  return {
    meta,
    result,
  };
};

const getSingleProductFromDB = async (id: string) => {
  const product = await Product.findById(id);

  if (!product) {
    throw new AppError(httpStatus.NOT_FOUND, 'Product not found !');
  }

  return product;
};

const deleteProductFromDB = async (
  productId: string,
  currentUserId: string,
  role: string,
) => {
  const product = await Product.findById(productId);

  if (!product) {
    throw new AppError(httpStatus.NOT_FOUND, 'Product not found!');
  }

  const shop = product.shop as IShop;
  const shopId = shop._id;
  const vendor = shop.vendor as IUser;
  const vendorId = vendor._id;

  // Authorization check
  const isAuthorized =
    role === 'admin' ||
    role === 'superAdmin' ||
    (role === 'vendor' && vendorId.toString() === currentUserId);

  if (!isAuthorized) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'You are not authorized to delete this Product!',
    );
  }

  // Mark Product as deleted
  const deletedProduct = await Product.findOneAndUpdate(
    { _id: productId, shop: shopId },
    { isDeleted: true },
    { new: true },
  );

  if (!deletedProduct) {
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Failed to delete the Product!',
    );
  }

  return deletedProduct;
};

export const ProductService = {
  createProductIntoDB,
  updateProductIntoDB,
  getAllProductsFromDB,
  getSingleProductFromDB,
  deleteProductFromDB,
};