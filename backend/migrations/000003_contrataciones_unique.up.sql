ALTER TABLE contrataciones
  ADD CONSTRAINT uq_contratacion
  UNIQUE (anio, mes, departamento, catalogo, tipo_compra, acuerdo_marco);
