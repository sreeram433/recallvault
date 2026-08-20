import logging
import os


def configure_logging() -> None:
    if os.getenv("K_SERVICE"):
        try:
            import google.cloud.logging

            google.cloud.logging.Client().setup_logging()
            return
        except Exception:
            pass
    logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"), format="%(levelname)s %(name)s %(message)s")
