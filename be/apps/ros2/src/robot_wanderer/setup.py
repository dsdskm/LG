from setuptools import find_packages, setup

package_name = 'robot_wanderer'

setup(
    name=package_name,
    version='0.1.0',
    packages=find_packages(exclude=['test']),
    data_files=[
        ('share/ament_index/resource_index/packages',
            ['resource/' + package_name]),
        ('share/' + package_name, ['package.xml']),
    ],
    install_requires=['setuptools', 'mcap', 'requests'],
    zip_safe=True,
    maintainer='you',
    maintainer_email='you@example.com',
    description='A robot that wanders around a virtual map autonomously.',
    license='MIT',
    tests_require=['pytest'],
    entry_points={
        'console_scripts': [
            'wanderer = robot_wanderer.wanderer_node:main',
        ],
    },
)
