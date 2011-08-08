# Run a command and get stdout, stderr and returncode
class Command(object):
	def __init__(self, command, shell=True):
		import subprocess as sp

		process = sp.Popen(command, shell = shell, stdout = sp.PIPE, stderr = sp.PIPE)
		self.stdout, self.stderr = process.communicate()
		self.returncode = process.returncode
