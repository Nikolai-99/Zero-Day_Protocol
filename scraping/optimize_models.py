import json
import os
import struct


class GLBParser:
    def __init__(self, filepath):
        self.filepath = filepath
        self.json_data = None
        self.binary_chunk = None
        self.total_vertices = 0
        self.total_triangles = 0
        self.meshes_info = []
        self.materials_info = []
        self.textures_info = []
        self.read_glb()

    def read_glb(self):
        if not os.path.exists(self.filepath):
            print(f"Error: File {self.filepath} not found.")
            return

        with open(self.filepath, "rb") as f:
            # Read header
            header = f.read(12)
            if len(header) < 12:
                print("Error: Invalid GLB header length.")
                return

            magic, version, length = struct.unpack("<III", header)
            if magic != 0x46546C67:  # "glTF"
                print("Error: Not a valid GLB file.")
                return

            # Read JSON chunk
            chunk_header = f.read(8)
            if len(chunk_header) < 8:
                print("Error: Cannot read chunk header.")
                return

            chunk_length, chunk_type = struct.unpack("<II", chunk_header)
            if chunk_type != 0x4E4F534A:  # "JSON"
                print("Error: First chunk is not JSON.")
                return

            json_bytes = f.read(chunk_length)
            self.json_data = json.loads(json_bytes.decode("utf-8"))

            # Read binary chunk (if exists)
            bin_header = f.read(8)
            if len(bin_header) == 8:
                bin_length, bin_type = struct.unpack("<II", bin_header)
                if bin_type == 0x004E4942:  # "BIN"
                    self.binary_chunk = f.read(bin_length)

        if self.json_data:
            self.analyze()

    def analyze(self):
        accessors = self.json_data.get("accessors", [])

        # Analyze materials
        materials = self.json_data.get("materials", [])
        for i, mat in enumerate(materials):
            pbr = mat.get("pbrMetallicRoughness", {})
            base_color = pbr.get("baseColorFactor", [1.0, 1.0, 1.0, 1.0])
            emissive = mat.get("emissiveFactor", [0.0, 0.0, 0.0])
            self.materials_info.append(
                {
                    "index": i,
                    "name": mat.get("name", f"Material_{i}"),
                    "baseColor": base_color,
                    "emissive": emissive,
                    "doubleSided": mat.get("doubleSided", False),
                }
            )

        # Analyze meshes
        meshes = self.json_data.get("meshes", [])
        for i, mesh in enumerate(meshes):
            primitives_list = []
            mesh_vertices = 0
            mesh_triangles = 0

            for prim in mesh.get("primitives", []):
                attributes = prim.get("attributes", {})
                position_acc_idx = attributes.get("POSITION")
                indices_acc_idx = prim.get("indices")

                vertices_count = 0
                triangles_count = 0

                if position_acc_idx is not None and position_acc_idx < len(accessors):
                    vertices_count = accessors[position_acc_idx].get("count", 0)
                    mesh_vertices += vertices_count

                if indices_acc_idx is not None and indices_acc_idx < len(accessors):
                    indices_count = accessors[indices_acc_idx].get("count", 0)
                    triangles_count = indices_count // 3
                    mesh_triangles += triangles_count
                else:
                    triangles_count = vertices_count // 3
                    mesh_triangles += triangles_count

                primitives_list.append(
                    {
                        "vertices": vertices_count,
                        "triangles": triangles_count,
                        "material": prim.get("material", "default"),
                    }
                )

            self.total_vertices += mesh_vertices
            self.total_triangles += mesh_triangles

            self.meshes_info.append(
                {
                    "index": i,
                    "name": mesh.get("name", f"Mesh_{i}"),
                    "primitives": primitives_list,
                    "total_vertices": mesh_vertices,
                    "total_triangles": mesh_triangles,
                }
            )

        # Analyze textures
        textures = self.json_data.get("textures", [])
        self.textures_info = [
            {"index": i, "name": tex.get("name", f"Texture_{i}")} for i, tex in enumerate(textures)
        ]

    def report(self):
        filename = os.path.basename(self.filepath)
        print("==================================================")
        print(f" REPORT: {filename}")
        print("==================================================")
        print(f"Total Vertices: {self.total_vertices}")
        print(f"Total Triangles: {self.total_triangles}")
        print(f"Total Meshes: {len(self.meshes_info)}")
        print(f"Total Materials: {len(self.materials_info)}")
        print(f"Total Textures: {len(self.textures_info)}")
        print()

        print("--- Meshes Details ---")
        for m in self.meshes_info:
            print(f"Mesh '{m['name']}':")
            print(f"  Vertices: {m['total_vertices']}, Triangles: {m['total_triangles']}")
            for idx, prim in enumerate(m["primitives"]):
                print(
                    f"  Primitive {idx}: Verts={prim['vertices']}, "
                    f"Tris={prim['triangles']}, MatIndex={prim['material']}"
                )
        print()

        print("--- Materials Details ---")
        for mat in self.materials_info:
            print(f"Material '{mat['name']}':")
            print(f"  Base Color Factor: {mat['baseColor']}")
            print(f"  Emissive Factor: {mat['emissive']}")
            print(f"  Double Sided: {mat['doubleSided']}")
        print()

        # Check performance concerns
        print("--- Performance Check ---")
        warnings = []
        if self.total_triangles > 3000:
            warnings.append(
                f"WARNING: High triangle count ({self.total_triangles}) for a low-poly asset."
            )
        if len(self.textures_info) > 2:
            warnings.append(
                f"WARNING: Too many textures ({len(self.textures_info)}). Prefer combining them."
            )
        if len(self.materials_info) > 4:
            warnings.append(
                f"WARNING: Too many materials ({len(self.materials_info)}). "
                "Generates multiple draw calls."
            )

        if not warnings:
            print("[OK] Asset is highly optimized for low-end devices (UHD 620).")
        else:
            for w in warnings:
                print(w)
        print("==================================================\n")


if __name__ == "__main__":
    models_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "assets", "3D Models")
    kit_virus_path = os.path.join(models_dir, "KiT_Virus.glb")
    player_cursor_path = os.path.join(models_dir, "Player_Cursor.glb")

    print("Analyzing game 3D models...\n")
    if os.path.exists(kit_virus_path):
        parser = GLBParser(kit_virus_path)
        parser.report()
    else:
        print(f"Could not find KiT_Virus.glb at {kit_virus_path}")

    if os.path.exists(player_cursor_path):
        parser = GLBParser(player_cursor_path)
        parser.report()
    else:
        print(f"Could not find Player_Cursor.glb at {player_cursor_path}")
