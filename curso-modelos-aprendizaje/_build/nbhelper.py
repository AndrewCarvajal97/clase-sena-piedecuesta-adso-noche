"""
Helper para generar notebooks (.ipynb) compatibles con Google Colab.

Uso en un script generador:

    from nbhelper import Nb
    nb = Nb()
    nb.md("# Título")
    nb.code("print('hola')")
    nb.save("../notebooks/00_intro.ipynb")
"""
import nbformat as nbf


class Nb:
    def __init__(self):
        self.nb = nbf.v4.new_notebook()
        self.nb.metadata = {
            "kernelspec": {"name": "python3", "display_name": "Python 3"},
            "language_info": {"name": "python"},
            "colab": {"provenance": [], "toc_visible": True},
        }
        self.nb.cells = []

    def md(self, text):
        """Agrega una celda de texto (Markdown)."""
        self.nb.cells.append(nbf.v4.new_markdown_cell(text.rstrip("\n")))
        return self

    def code(self, text):
        """Agrega una celda de código."""
        self.nb.cells.append(nbf.v4.new_code_cell(text.strip("\n")))
        return self

    def save(self, path):
        nbf.validate(self.nb)
        nbf.write(self.nb, path)
        print("OK:", path, "-", len(self.nb.cells), "celdas")
