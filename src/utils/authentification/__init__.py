from abc import ABC, abstractmethod
from typing import Annotated, Optional

import jwt
from fastapi import Security
from fastapi.params import Header
from fastapi.security import HTTPBearer, APIKeyHeader
from fastapi.security.utils import get_authorization_scheme_param
from jwt import InvalidTokenError
from starlette.exceptions import HTTPException

import settings
from settings import AuthProvider
from utils.correlation import get_logger
from utils.exceptions import InvalidToken

logger = get_logger(__name__)

class AuthProviderInterface(ABC):
    @classmethod
    @abstractmethod
    def controller_dependency(cls, token: str):
        raise NotImplementedError()

    @classmethod
    @abstractmethod
    def check_token(cls, token: str):
        raise NotImplementedError()

    @staticmethod
    @abstractmethod
    def _check_token(token: str) -> bool:
        raise NotImplementedError()

    @classmethod
    def _validate_for_controller(cls, token: str):
        if not cls._check_token(token):
            raise HTTPException(status_code=403, detail="Token invalid")

    @classmethod
    def _validate_in_place(cls, token: str):
        if not cls._check_token(token):
            raise InvalidToken()


class SettingsTokenProvider(AuthProviderInterface):
    @staticmethod
    def _check_token(token: str) -> bool:
        return token == settings.TOKEN

    @classmethod
    def controller_dependency(cls, token: Annotated[str, Header(alias="token")]):
        cls._validate_for_controller(token)

    @classmethod
    def check_token(cls, token: str):
        cls._validate_in_place(token)


class ServiceKeyProvider(AuthProviderInterface):
    @staticmethod
    def _check_token(token: str) -> bool:
        return token == settings.SERVICE_KEY

    @classmethod
    def controller_dependency(cls, token: Annotated[str, Header(alias="service-key")]):
        cls._validate_for_controller(token)

    @classmethod
    def check_token(cls, token: str):
        cls._validate_in_place(token)


class JwtProvider(AuthProviderInterface):
    @staticmethod
    def _check_token(token: str) -> bool:
        try:
            jwt.decode(
                token,
                key=f"-----BEGIN PUBLIC KEY-----\n{settings.JWT_PUBLIC_KEY}\n-----END PUBLIC KEY-----",
                algorithms=[settings.JWT_ALGORITHM],
                issuer=[settings.SESSION_JWT_ISSUER, settings.BACKWARD_COMPATIBILITY_JWT_ISSUER],
                leeway=settings.JWT_CLOCK_SKEW
            )
            return True
        except InvalidTokenError as ex:
            logger.warning(f"JWT token invalid: {type(ex).__name__}-{ex}")
            return False

    @classmethod
    def controller_dependency(
            cls,
            token: Optional[str] = Security(APIKeyHeader(name='Authorization', auto_error=False)),
            token_header: Optional[str] = Header(alias="token", default=None)
    ):
        scheme, param = get_authorization_scheme_param(token)
        if (token and scheme.lower() != "bearer") or (not token and not token_header):
            raise HTTPException(
                status_code=401,
                detail="Not authenticated",
                headers={"WWW-Authenticate": "Bearer"},
            )

        cls._validate_for_controller(param or token_header)

    @classmethod
    def check_token(cls, token: str):
        cls._validate_in_place(token)


class OuterJwtProvider(AuthProviderInterface):
    @staticmethod
    def _check_token(token: str) -> bool:
        return True

    @classmethod
    def controller_dependency(cls, token = Security(HTTPBearer(auto_error=False))): # noqa remove param for proper fast api work
        pass

    @classmethod
    def check_token(cls, token: str):
        pass


class DisabledAuthProvider(AuthProviderInterface):
    @staticmethod
    def _check_token(token: str) -> bool:
        return True

    @classmethod
    def controller_dependency(cls): # noqa remove param for proper fast api work
        pass

    @classmethod
    def check_token(cls, token: str):
        pass


_mapping = {
    AuthProvider.jwt: JwtProvider,
    AuthProvider.token: SettingsTokenProvider,
    AuthProvider.service_key: ServiceKeyProvider,
    AuthProvider.no_check: DisabledAuthProvider,
    AuthProvider.outer_jwt: OuterJwtProvider
}

external_base_provider = _mapping[settings.EXTERNAL_AUTH_PROVIDER]
ws_base_provider = _mapping[settings.WS_AUTH_PROVIDER]
internal_base_provider = _mapping[settings.INTERNAL_AUTH_PROVIDER]