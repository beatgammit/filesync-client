import os

def getEnv():
	# Get data from environment and normalize
	compile_pam = False
	if 'npm_config_pam_module' in os.environ:
		compile_pam = os.environ['npm_cofig_pam_module'].lower()
	elif 'npm_package_config_pam_module' in os.environ:
		compile_pam = os.environ['npm_package_config_pam_module'].lower()

	# Make sure compile_pam is set to either true or false
	if compile_pam == 'true':
		compile_pam = True
	else:
		compile_pam = False

	# Make sure we have a module name
	pam_module_path = 'http-auth.so'
	if 'npm_config_pam_module_path' in os.environ:
		pam_module_path = os.environ['npm_cofig_pam_module_path']
	elif 'npm_package_config_pam_module_path' in os.environ:
		pam_module_path = os.environ['npm_package_config_pam_module_path']

	if len(pam_module_path) <= 0:
		pam_module_path = 'http-auth.so'

	return compile_pam, pam_module_path
