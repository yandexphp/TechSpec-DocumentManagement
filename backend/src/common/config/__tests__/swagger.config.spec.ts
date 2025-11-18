import { createSwaggerConfig } from '../swagger.config';

describe('createSwaggerConfig', () => {
  it('should create Swagger config with correct title', () => {
    const config = createSwaggerConfig();

    expect(config.info.title).toBe('Document Management System API');
  });

  it('should create Swagger config with correct description', () => {
    const config = createSwaggerConfig();

    expect(config.info.description).toBe(
      'API для управления документами с аутентификацией и файловым хранилищем'
    );
  });

  it('should create Swagger config with correct version', () => {
    const config = createSwaggerConfig();

    expect(config.info.version).toBe('1.0');
  });

  it('should include JWT Bearer auth', () => {
    const config = createSwaggerConfig();

    const bearerAuth = config.components?.securitySchemes?.['JWT-auth'];
    expect(bearerAuth).toBeDefined();
    if (bearerAuth && typeof bearerAuth === 'object' && 'type' in bearerAuth) {
      expect(bearerAuth.type).toBe('http');
      if ('scheme' in bearerAuth) {
        expect(bearerAuth.scheme).toBe('bearer');
      }
    }
  });

  it('should include cookie auth', () => {
    const config = createSwaggerConfig();

    const securitySchemes = config.components?.securitySchemes;
    expect(securitySchemes).toBeDefined();

    const allSchemes = Object.values(securitySchemes || {});
    const cookieAuth = allSchemes.find((scheme) => {
      return (
        typeof scheme === 'object' && scheme !== null && 'in' in scheme && scheme.in === 'cookie'
      );
    });

    expect(cookieAuth).toBeDefined();
    if (
      cookieAuth &&
      typeof cookieAuth === 'object' &&
      'type' in cookieAuth &&
      'in' in cookieAuth
    ) {
      expect(cookieAuth.type).toBe('apiKey');
      expect(cookieAuth.in).toBe('cookie');
    }
  });

  it('should include auth and documents tags', () => {
    const config = createSwaggerConfig();

    expect(config.tags).toHaveLength(2);
    expect(config.tags?.[0]?.name).toBe('auth');
    expect(config.tags?.[1]?.name).toBe('documents');
  });
});
