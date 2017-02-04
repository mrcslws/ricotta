import platform
import sys

from setuptools import find_packages, setup

setup(name="ricotta",
      version="0.0.2",
      description="Visualize bird songs",
      author="Marcus Lewis",
      author_email="mrcslws@gmail.com",
      url="https://github.com/mrcslws/ricotta",
      packages=find_packages(),
      package_data={'ricotta': ['package_data/*',]},
      include_package_data=True,
)
